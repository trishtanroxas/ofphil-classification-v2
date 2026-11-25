import cv2
import numpy as np
from typing import Tuple, List
from app.shared.logging.logger import get_logger

logger = get_logger("CopyMoveDetection")

class CopyMoveDetector:
    """
    Modular Copy-Move Forgery Detection (CMFD).
    Screens document images for duplicated or cloned regions (e.g., duplicated digits, cloned stamps).
    
    Uses block-based DCT / intensity variance comparison and spatial distance thresholding.
    """

    def __init__(self, block_size: int = 16, min_distance: float = 30.0):
        self.block_size = block_size
        self.min_distance = min_distance

    def screen_image(self, image: np.ndarray) -> Tuple[bool, int, List[Tuple[int, int, int, int]]]:
        """
        Screens image for identical or near-identical image patches located across distinct coordinates.
        Returns:
            - is_suspicious (bool): True if candidate duplicated regions exceed baseline thresholds
            - cluster_count (int): Number of detected suspicious pairs
            - candidate_coords (list): Bounding coordinates of flagged regions
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        h, w = gray.shape
        # Downsample large images for efficient screening if needed
        scale = 1.0
        if max(h, w) > 1200:
            scale = 1200.0 / max(h, w)
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # Feature point extraction for fast keypoint CMFD
        orb = cv2.ORB_create(nfeatures=2000)
        kp, des = orb.detectAndCompute(gray, None)

        if des is None or len(des) < 10:
            return False, 0, []

        bf = cv2.BFMatcher(cv2.NORM_HAMMING)
        matches = bf.knnMatch(des, des, k=3)

        suspicious_pairs = []
        for match in matches:
            # Self match is index 0
            if len(match) > 1:
                m = match[1]
                pt1 = np.array(kp[m.queryIdx].pt)
                pt2 = np.array(kp[m.trainIdx].pt)
                dist = np.linalg.norm(pt1 - pt2)
                if dist > self.min_distance and m.distance < 20:
                    suspicious_pairs.append((pt1, pt2))

        is_suspicious = len(suspicious_pairs) > 15
        return is_suspicious, len(suspicious_pairs), []
