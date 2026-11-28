"""
Forensic Feature Extractors and Screening Modules for OFPHIL V2 Document Authenticity.

Approved Forensic Checks:
- Image Preprocessing (Deskewing, Contrast CLAHE, Denoising)
- ELA (Error Level Analysis)
- Noise Inconsistency Analysis (Wavelet/Median residual variance across patches)
- Chromatic Artifact Analysis (Inter-channel chromatic aberration / dispersion)
- ORB Copy-Move Forgery Detection (Keypoint clustering and Euclidean distance matching)
- Edge Analysis (Canny edge density & gradient sharpness disparity)
- Image Metadata Analysis (EXIF / software signatures / editing tags)
- Resolution & Compression Analysis (Pixel dimensions, aspect ratio, JPEG quality assessment)

Individual Screening Module Statuses:
- PASSED
- SUSPICIOUS
- NOT_EVALUATED
- INSUFFICIENT_EVIDENCE
"""
import io
import math
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image, ExifTags

from app.shared.logging.logger import get_logger

logger = get_logger("DocumentForensics")


class DocumentForensicAnalyzer:
    """
    Forensic analysis engine implementing approved non-destructive image forensics.
    Every check returns:
    - status: PASSED | SUSPICIOUS | NOT_EVALUATED | INSUFFICIENT_EVIDENCE
    - findings / evidence: quantitative metrics and diagnostic details
    - reason: defensible narrative
    """

    def __init__(
        self,
        ela_quality: int = 90,
        ela_suspicious_std: float = 8.0,
        ela_disparity_ratio_thresh: float = 3.2,
        noise_inconsistency_thresh: float = 4.0,
        chroma_dispersion_thresh: float = 650.0,
        min_resolution_dim: int = 600,
        min_laplacian_sharpness: float = 25.0,
        max_laplacian_sharpness: float = 1200.0,
    ):
        self.ela_quality = ela_quality
        self.ela_suspicious_std = ela_suspicious_std
        self.ela_disparity_ratio_thresh = ela_disparity_ratio_thresh
        self.noise_inconsistency_thresh = noise_inconsistency_thresh
        self.chroma_dispersion_thresh = chroma_dispersion_thresh
        self.min_resolution_dim = min_resolution_dim
        self.min_laplacian_sharpness = min_laplacian_sharpness
        self.max_laplacian_sharpness = max_laplacian_sharpness

    def analyze(self, raw_bytes: bytes, filename: str = "") -> Dict[str, Any]:
        """Runs the suite of forensic checks on an image file."""
        try:
            pil_img = Image.open(io.BytesIO(raw_bytes))
            # Metadata analysis first (before converting to RGB array)
            meta_result = self.analyze_metadata(pil_img, filename)

            # Convert to OpenCV RGB and Grayscale
            pil_rgb = pil_img.convert("RGB")
            img_bgr = cv2.cvtColor(np.array(pil_rgb), cv2.COLOR_RGB2BGR)
            h, w = img_bgr.shape[:2]
        except Exception as e:
            logger.error(f"Failed to decode image bytes for forensics: {e}")
            err_dict = {
                "status": "INSUFFICIENT_EVIDENCE",
                "details": f"Could not decode image payload: {type(e).__name__}",
                "metrics": {},
            }
            return {
                "resolution_analysis": err_dict,
                "metadata_analysis": err_dict,
                "ela_analysis": err_dict,
                "noise_analysis": err_dict,
                "chromatic_analysis": err_dict,
                "edge_analysis": err_dict,
                "copy_move_analysis": err_dict,
            }

        # 1. Resolution & Compression Quality Check
        res_result = self.analyze_resolution(w, h, len(raw_bytes))

        # If resolution is critically degraded, subsequent checks may be unreliable
        if h < 200 or w < 200:
            insufficient = {
                "status": "INSUFFICIENT_EVIDENCE",
                "details": f"Document resolution ({w}x{h}) is too low to extract reliable forensic evidence.",
                "metrics": {"width": w, "height": h},
            }
            return {
                "resolution_analysis": res_result,
                "metadata_analysis": meta_result,
                "ela_analysis": insufficient,
                "noise_analysis": insufficient,
                "chromatic_analysis": insufficient,
                "edge_analysis": insufficient,
                "copy_move_analysis": insufficient,
            }

        # 2. ELA (Error Level Analysis)
        ela_result = self.analyze_ela(pil_rgb)

        # 3. Noise Inconsistency Analysis
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        noise_result = self.analyze_noise(gray)

        # 4. Chromatic Artifact Analysis
        chroma_result = self.analyze_chromatic(img_bgr)

        # 5. Edge Analysis & Gradient Disparity
        edge_result = self.analyze_edges(gray)

        # 6. ORB Copy-Move Forgery Screening
        cmfd_result = self.analyze_copy_move(gray)

        return {
            "resolution_analysis": res_result,
            "metadata_analysis": meta_result,
            "ela_analysis": ela_result,
            "noise_analysis": noise_result,
            "chromatic_analysis": chroma_result,
            "edge_analysis": edge_result,
            "copy_move_analysis": cmfd_result,
        }

    def analyze_metadata(self, pil_img: Image.Image, filename: str) -> Dict[str, Any]:
        """Extracts and evaluates EXIF tags, creation software, and digital editing signatures."""
        info = pil_img.info or {}
        meta_str = " ".join(f"{k}:{v}" for k, v in info.items()).lower()

        # Check for known image manipulation software signatures
        editor_signatures = [
            "photoshop", "gimp", "canva", "pixlr", "illustrator",
            "paint.net", "photopea", "coreldraw", "affinity"
        ]
        detected_software = [sw for sw in editor_signatures if sw in meta_str]

        exif_data: Dict[str, Any] = {}
        has_exif = False
        try:
            raw_exif = pil_img.getexif()
            if raw_exif:
                has_exif = True
                for tag_id, value in raw_exif.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    # Avoid binary serialization issues
                    if isinstance(value, (str, int, float)):
                        exif_data[tag_name] = value
        except Exception:
            pass

        software_tag = str(info.get("Software") or exif_data.get("Software") or "")
        if software_tag:
            for sw in editor_signatures:
                if sw in software_tag.lower() and sw not in detected_software:
                    detected_software.append(sw)

        if detected_software:
            status = "SUSPICIOUS"
            details = f"Digital editing software traces detected in image metadata: {', '.join(detected_software)}."
        elif not has_exif and not info:
            status = "NOT_EVALUATED"
            details = "Image metadata absent (common for web uploads, photocopies, scans, or privacy-scrubbed files). Missing metadata alone does not indicate forgery."
        else:
            status = "PASSED"
            details = "Standard image metadata present without unauthorized photo-editing application markers."

        return {
            "status": status,
            "details": details,
            "metrics": {
                "has_exif": has_exif,
                "detected_editing_software": detected_software,
                "format": pil_img.format or "UNKNOWN",
            },
        }

    def analyze_resolution(self, width: int, height: int, file_size_bytes: int) -> Dict[str, Any]:
        """Evaluates spatial resolution, aspect ratio, and pixel count for auditability."""
        min_dim = min(width, height)
        max_dim = max(width, height)
        aspect_ratio = round(max_dim / max(1, min_dim), 2)
        total_pixels = width * height

        if min_dim < 300 or total_pixels < 150000:
            status = "INSUFFICIENT_EVIDENCE"
            details = f"Extremely low image resolution ({width}x{height}, {total_pixels:,} px). Insufficient for definitive forensic verification."
        elif min_dim < self.min_resolution_dim:
            status = "SUSPICIOUS"
            details = f"Sub-optimal resolution ({width}x{height}). Small print, fine stamps, or micro-signatures may be obscured."
        else:
            status = "PASSED"
            details = f"Resolution ({width}x{height}, {round(total_pixels/1e6, 2)} MP) meets clinical evidential standards."

        return {
            "status": status,
            "details": details,
            "metrics": {
                "width": width,
                "height": height,
                "aspect_ratio": aspect_ratio,
                "total_pixels": total_pixels,
                "file_size_kb": round(file_size_bytes / 1024, 1),
            },
        }

    def analyze_ela(self, pil_rgb: Image.Image) -> Dict[str, Any]:
        """
        Error Level Analysis (ELA) with 8x8 regional patch disparity and localized variance.
        Detects differences in compression levels between modified elements and background.
        """
        w, h = pil_rgb.size
        buf = io.BytesIO()
        pil_rgb.save(buf, format="JPEG", quality=self.ela_quality)
        buf.seek(0)
        resaved = Image.open(buf).convert("RGB")

        orig_np = np.asarray(pil_rgb, dtype=np.int16)
        resaved_np = np.asarray(resaved, dtype=np.int16)
        diff = np.abs(orig_np - resaved_np)

        ela_mean = float(np.mean(diff))
        ela_std = float(np.std(diff))
        ela_max = float(np.max(diff))

        # Regional 8x8 patch ELA disparity
        patch_means: List[float] = []
        gh, gw = max(1, h // 8), max(1, w // 8)
        for py in range(0, h - gh + 1, gh):
            for px in range(0, w - gw + 1, gw):
                patch_means.append(float(np.mean(diff[py : py + gh, px : px + gw])))

        median_patch = float(np.median(patch_means)) if patch_means else ela_mean
        max_patch = float(np.max(patch_means)) if patch_means else ela_mean
        patch_ratio = round(max_patch / max(0.2, median_patch), 2)

        # High variance across patches or abnormally high std indicates localized re-compression/splicing
        is_suspicious = (
            (ela_std > self.ela_suspicious_std and ela_max > 45.0)
            or (patch_ratio > self.ela_disparity_ratio_thresh and max_patch > 12.0)
        )

        if is_suspicious:
            status = "SUSPICIOUS"
            details = (
                f"Localized compression disparity detected (patch ratio {patch_ratio}x, ELA std {round(ela_std, 2)}). "
                "Possible digital splicing or pasted region."
            )
        else:
            status = "PASSED"
            details = (
                f"Uniform compression profile across document regions (patch ratio {patch_ratio}x, ELA std {round(ela_std, 2)})."
            )

        return {
            "status": status,
            "details": details,
            "metrics": {
                "ela_mean": round(ela_mean, 3),
                "ela_std": round(ela_std, 3),
                "ela_max": round(ela_max, 3),
                "patch_ela_disparity_ratio": patch_ratio,
                "median_patch_ela": round(median_patch, 3),
                "max_patch_ela": round(max_patch, 3),
            },
        }

    def analyze_noise(self, gray: np.ndarray) -> Dict[str, Any]:
        """
        Noise Inconsistency Analysis.
        High-pass residual (median filter subtraction) computed across local spatial blocks.
        Spliced elements from foreign cameras or digital renders carry discordant noise profiles.
        """
        h, w = gray.shape
        denoised = cv2.medianBlur(gray, 3)
        residual = cv2.absdiff(gray, denoised).astype(np.float32)

        overall_noise_mean = float(np.mean(residual))
        overall_noise_std = float(np.std(residual))

        # Regional grid noise variance
        gh, gw = max(1, h // 8), max(1, w // 8)
        block_variances = []
        for py in range(0, h - gh + 1, gh):
            for px in range(0, w - gw + 1, gw):
                patch = residual[py : py + gh, px : px + gw]
                block_variances.append(float(np.var(patch)))

        if not block_variances:
            return {
                "status": "NOT_EVALUATED",
                "details": "Insufficient dimensions to compute localized noise blocks.",
                "metrics": {},
            }

        median_var = float(np.median(block_variances))
        max_var = float(np.max(block_variances))
        noise_disparity = round(max_var / max(0.05, median_var), 2)

        # Flag if a patch exhibits drastically different high-frequency noise
        if noise_disparity > self.noise_inconsistency_thresh and max_var > 15.0:
            status = "SUSPICIOUS"
            details = (
                f"Pronounced noise variance discrepancy across image blocks (disparity ratio {noise_disparity}x). "
                "Inconsistent sensor or rendering noise levels detected."
            )
        else:
            status = "PASSED"
            details = f"Consistent sensor/scan noise floor across regional blocks (disparity ratio {noise_disparity}x)."

        return {
            "status": status,
            "details": details,
            "metrics": {
                "noise_mean": round(overall_noise_mean, 3),
                "noise_std": round(overall_noise_std, 3),
                "noise_disparity_ratio": noise_disparity,
                "median_block_variance": round(median_var, 3),
                "max_block_variance": round(max_var, 3),
            },
        }

    def analyze_chromatic(self, img_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Chromatic Artifact Analysis.
        Examines color channel variance and chromatic aberration dispersion.
        Pure digital composites or pasted scans frequently lack natural optical dispersion.
        """
        b, g, r = cv2.split(img_bgr.astype(np.float32))
        rg_diff = np.abs(r - g)
        bg_diff = np.abs(b - g)
        chroma_dispersion = float(np.var(rg_diff) + np.var(bg_diff))

        # Check for abnormal chromatic saturation spikes
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        sat_std = float(np.std(sat))

        if chroma_dispersion > self.chroma_dispersion_thresh:
            status = "SUSPICIOUS"
            details = f"Elevated chromatic dispersion ({round(chroma_dispersion, 1)}). Possible artificial color fringing or synthetic paste."
        else:
            status = "PASSED"
            details = f"Natural optical color balance and uniform chromatic dispersion ({round(chroma_dispersion, 1)})."

        return {
            "status": status,
            "details": details,
            "metrics": {
                "chroma_dispersion": round(chroma_dispersion, 2),
                "saturation_std": round(sat_std, 2),
            },
        }

    def analyze_edges(self, gray: np.ndarray) -> Dict[str, Any]:
        """
        Edge Analysis & Laplacian Gradient Sharpness Disparity.
        Evaluates boundary gradients to detect razor-sharp synthetic paste boundaries
        or extreme unnatural blur.
        """
        h, w = gray.shape
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.count_nonzero(edges)) / float(h * w)

        # Evaluate edge sharpness extremes
        if lap_var < self.min_laplacian_sharpness:
            status = "SUSPICIOUS"
            details = f"Severe image blur detected (Laplacian variance {round(lap_var, 1)} < {self.min_laplacian_sharpness}). Fine security text or stamp details may be degraded."
        elif lap_var > self.max_laplacian_sharpness and edge_density > 0.05:
            # Synthetic / direct vector rendering often produces extremely crisp artificial edges
            status = "SUSPICIOUS"
            details = f"Unnaturally elevated edge sharpness ({round(lap_var, 1)}). Indicates synthetic rasterization, screenshot, or digital editing."
        else:
            status = "PASSED"
            details = f"Expected optical edge gradient and natural sharpness (Laplacian variance {round(lap_var, 1)})."

        return {
            "status": status,
            "details": details,
            "metrics": {
                "laplacian_sharpness_var": round(lap_var, 2),
                "canny_edge_density": round(edge_density, 4),
            },
        }

    def analyze_copy_move(self, gray: np.ndarray) -> Dict[str, Any]:
        """
        ORB Copy-Move Forgery Detection (CMFD).
        Extracts keypoints and matches descriptors with spatial distance constraints
        to identify duplicated regions (e.g. duplicated numbers, forged seals).
        """
        h, w = gray.shape
        scale = 1.0
        if max(h, w) > 1200:
            scale = 1200.0 / max(h, w)
            proc_gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        else:
            proc_gray = gray

        orb = cv2.ORB_create(nfeatures=2000)
        kp, des = orb.detectAndCompute(proc_gray, None)

        if des is None or len(des) < 15:
            return {
                "status": "NOT_EVALUATED",
                "details": "Insufficient textural keypoints for copy-move feature matching.",
                "metrics": {"keypoints_extracted": 0, "duplicated_pairs": 0},
            }

        bf = cv2.BFMatcher(cv2.NORM_HAMMING)
        matches = bf.knnMatch(des, des, k=3)

        min_pixel_distance = 35.0 * scale
        duplicated_pairs: List[Tuple[Tuple[float, float], Tuple[float, float]]] = []

        for match in matches:
            if len(match) > 1:
                m = match[1]  # match[0] is self
                pt1 = np.array(kp[m.queryIdx].pt)
                pt2 = np.array(kp[m.trainIdx].pt)
                dist = np.linalg.norm(pt1 - pt2)
                if dist > min_pixel_distance and m.distance < 25:
                    duplicated_pairs.append(((float(pt1[0]), float(pt1[1])), (float(pt2[0]), float(pt2[1]))))

        # Clustering: Multiple spatial pairs indicate genuine duplicate block duplication
        pair_count = len(duplicated_pairs)
        if pair_count >= 18:
            status = "SUSPICIOUS"
            details = f"Detected {pair_count} correlated keypoint pairs at distinct spatial locations, indicating potential copy-move duplication."
        elif pair_count > 0:
            status = "PASSED"
            details = f"Found {pair_count} incidental matching keypoints below suspicious duplication threshold (standard repeating font/lines)."
        else:
            status = "PASSED"
            details = "No duplicated image regions or copy-move clusters detected."

        return {
            "status": status,
            "details": details,
            "metrics": {
                "keypoints_extracted": len(kp),
                "duplicated_pairs_count": pair_count,
            },
        }
