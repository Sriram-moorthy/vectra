from shared.frame_extractor import FrameExtractor
from shared.pose_analyzer import PoseAnalyzer
from analyzers.squat_analyzer import SquatAnalyzer


class JobRunner:
    def __init__(self):
        self.frame_extractor = FrameExtractor()
        self.pose_analyzer = PoseAnalyzer()
        self.squat_analyzer = SquatAnalyzer()

    def run_squat_job(self, *, video_path: str, original_filename: str) -> dict:
        frame_count, frame_folder = self.frame_extractor.extract_frames(video_path)
        pose_results = self.pose_analyzer.analyze_frames(frame_folder)
        squat_report = self.squat_analyzer.analyze(
            pose_results=pose_results,
            video_path=video_path,
            frames_folder=frame_folder,
        )

        return {
            "status": "Video processed",
            "analysis_type": "squat",
            "filename": original_filename,
            "frames_extracted": frame_count,
            "pose_frames_detected": len(pose_results),
            "squat_analysis": squat_report,
        }
