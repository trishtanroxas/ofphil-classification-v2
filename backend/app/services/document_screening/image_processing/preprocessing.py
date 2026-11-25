import cv2
import numpy as np
from typing import Tuple

class DocumentImagePreprocessor:
    """
    OpenCV-based image preprocessing for scanned or photographed documents:
    - Deskewing using minAreaRect on binary contours
    - Denoising (Gaussian / Bilateral)
    - Contrast Enhancement (CLAHE)
    """

    @staticmethod
    def deskew(image: np.ndarray) -> Tuple[np.ndarray, float]:
        """Calculates skew angle and rotates the image upright."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        coords = np.column_stack(np.where(thresh > 0))
        if coords.shape[0] == 0:
            return image, 0.0

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )
        return rotated, float(angle)

    @staticmethod
    def enhance_contrast(image: np.ndarray) -> np.ndarray:
        """Applies CLAHE (Contrast Limited Adaptive Histogram Equalization)."""
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        else:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            return clahe.apply(image)
