import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple


class SmartReframer:
    """
    Intelligent reframing engine for converting horizontal 16:9 video to vertical 9:16.
    Performs face tracking, applies motion smoothing,
    and calculates optimal FFmpeg crop coordinates.
    """

    def __init__(self, target_width: int = 1080, target_height: int = 1920):
        self.target_width = target_width
        self.target_height = target_height
        self.face_detector = None

        # Check for OpenCV cascade or modern detector
        if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            try:
                self.face_detector = cv2.CascadeClassifier(cascade_path)
            except Exception:
                self.face_detector = None

    def analyze_face_positions(
        self,
        video_path: str,
        start_time_sec: float,
        end_time_sec: float,
        sample_interval_sec: float = 0.5
    ) -> List[float]:
        """
        Sample video frames across clip duration, detect faces or center of motion,
        and return normalized X-center coordinates (0.0 - 1.0).
        """
        if not video_path or not Path(video_path).exists():
            return [0.5]

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return [0.5]

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920.0
        height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080.0

        start_frame = int(start_time_sec * fps)
        end_frame = int(end_time_sec * fps)
        frame_step = max(1, int(sample_interval_sec * fps))

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        current_frame = start_frame

        detected_centers: List[float] = []

        while current_frame <= end_frame:
            ret, frame = cap.read()
            if not ret:
                break

            if self.face_detector is not None:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                small_gray = cv2.resize(gray, (640, 360))
                faces = self.face_detector.detectMultiScale(
                    small_gray,
                    scaleFactor=1.15,
                    minNeighbors=4,
                    minSize=(30, 30)
                )

                if len(faces) > 0:
                    largest_face = max(faces, key=lambda f: f[2] * f[3])
                    fx, fy, fw, fh = largest_face
                    face_center_x = (fx + fw / 2.0) / 640.0
                    detected_centers.append(face_center_x)

            current_frame += frame_step
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

        cap.release()

        if not detected_centers:
            return [0.5]

        return detected_centers

    def compute_smoothed_anchor(self, face_positions: List[float]) -> float:
        """Compute smoothed median/average face anchor to avoid camera jitter."""
        if not face_positions:
            return 0.5
        med = float(np.median(face_positions))
        return max(0.20, min(0.80, med))

    def get_crop_filter_and_params(
        self,
        video_path: str,
        start_time_sec: float,
        end_time_sec: float,
        tracking_mode: str = "face_tracker",
        manual_crop_offset_pct: Optional[float] = None,
        source_width: int = 1920,
        source_height: int = 1080
    ) -> Dict[str, Any]:
        """
        Generate FFmpeg crop and scale filter string for 9:16 vertical output.
        """
        target_aspect = self.target_width / self.target_height  # 9/16 = 0.5625

        crop_h = source_height
        crop_w = int(source_height * target_aspect)
        if crop_w % 2 != 0:
            crop_w -= 1
        if crop_h % 2 != 0:
            crop_h -= 1

        if manual_crop_offset_pct is not None:
            anchor_x = max(0.0, min(1.0, manual_crop_offset_pct / 100.0))
        elif tracking_mode == "face_tracker":
            positions = self.analyze_face_positions(video_path, start_time_sec, end_time_sec)
            anchor_x = self.compute_smoothed_anchor(positions)
        else:  # center_anchor
            anchor_x = 0.5

        desired_x = int(anchor_x * source_width - (crop_w / 2.0))
        max_x = max(0, source_width - crop_w)
        crop_x = max(0, min(max_x, desired_x))
        crop_y = 0

        filter_str = f"crop=w={crop_w}:h={crop_h}:x={crop_x}:y={crop_y},scale={self.target_width}:{self.target_height}:flags=lanczos"

        return {
            "crop_w": crop_w,
            "crop_h": crop_h,
            "crop_x": crop_x,
            "crop_y": crop_y,
            "anchor_x": round(anchor_x, 3),
            "filter_str": filter_str
        }
