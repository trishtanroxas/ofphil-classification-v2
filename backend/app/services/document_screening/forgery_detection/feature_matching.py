import cv2
import numpy as np
from typing import Tuple, Optional
from app.shared.logging.logger import get_logger

logger = get_logger("FeatureMatching")

class VisualFeatureMatcher:
    """
    ORB / SIFT Visual Feature Analysis.
    Supports stamp similarity checking, keypoint clustering, and geometric consistency.
    
    IMPORTANT: Feature matching identifies visual correspondence.
    It documents visual similarity only and does NOT definitively prove forgery on its own.
    """

    def __init__(self, method: str = "ORB", n_features: int = 1000):
        self.method = method.upper()
        if self.method == "SIFT":
            self.detector = cv2.SIFT_create(nfeatures=n_features)
        else:
            self.detector = cv2.ORB_create(nfeatures=n_features)

    def match_stamps(
        self, query_img: np.ndarray, template_img: np.ndarray
    ) -> Tuple[float, int]:
        """
        Calculates ratio-test good matches between a detected document stamp and reference template.
        Returns match ratio (0.0 to 1.0) and total good matches.
        """
        kp1, des1 = self.detector.detectAndCompute(query_img, None)
        kp2, des2 = self.detector.detectAndCompute(template_img, None)

        if des1 is None or des2 is None or len(des1) < 2 or len(des2) < 2:
            return 0.0, 0

        if self.method == "SIFT":
            bf = cv2.BFMatcher(cv2.NORM_L2)
        else:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING)

        matches = bf.knnMatch(des1, des2, k=2)
        good = []
        for m_n in matches:
            if len(m_n) == 2:
                m, n = m_n
                if m.distance < 0.75 * n.distance:
                    good.append(m)

        ratio = len(good) / max(1, min(len(kp1), len(kp2)))
        return float(min(1.0, ratio)), len(good)
