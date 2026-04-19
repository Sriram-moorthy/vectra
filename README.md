# Vectra

Vectra is a squat video analysis system built for coaches, trainers, and movement assessment workflows. It combines a FastAPI backend with a React + Vite frontend to upload a video, detect pose landmarks, classify the camera view, run squat-specific movement rules, and return annotated analysis frames with practical feedback.

The current product scope is focused on squat analysis.

## What Vectra Does

- Accepts squat videos from the UI
- Detects pose landmarks frame by frame using MediaPipe
- Classifies the recording as side view, front view, or not sufficient
- Runs side-view squat analysis for:
  - rep detection
  - squat depth
  - torso lean
- Runs front-view squat analysis for:
  - knee tracking / knee cave
- Generates annotated analysis frames that are served by the backend and shown in the UI
- Includes a simple first-iteration backend login flow using `admin / admin`

## Why View Quality Matters

Vectra is intentionally angle-sensitive.

- Side-view analysis is most reliable when the athlete is captured in a clean side profile.
- Front-view analysis is most reliable when the athlete faces the camera directly.
- If the camera is slightly angled, the system may still detect movement, but view-based rules can become unreliable.

To handle that more safely, the backend now includes capture-quality guidance and view suitability states:

- `good`
- `moderate`
- `not_sufficient`

This helps the product explain when a video is usable, partially usable, or not suitable for a trusted rule-based read.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite

### Backend

- FastAPI
- Python
- OpenCV
- MediaPipe Pose Landmarker

## Repository Structure

```text
MobilityDetectionSystem/
├── mobility-ai-service/
│   ├── analyzers/
│   ├── models/
│   ├── rules/
│   ├── services/
│   ├── shared/
│   ├── tests/
│   └── app.py
├── vectra-ui/
│   ├── src/
│   └── package.json
├── ANGLE_BASED_ANALYSIS.md
├── AUTHENTICATION.md
├── FRAME_ANNOTATION.md
├── IMPROVE_BOTTOM_FRAME_DETECTION.md
├── SPECIFICATION.md
└── README.md
```

## Request Flow

1. A user signs in from the frontend.
2. The frontend uploads a squat video to the backend.
3. The backend stores the upload locally.
4. Frames are extracted from the uploaded video.
5. Pose landmarks are analyzed across the extracted frames.
6. The squat analyzer classifies the camera view and applies the supported rule set.
7. Annotated output frames are generated for the relevant rep or knee-tracking frame.
8. The frontend displays the results, analysis summary, and frame previews.

## Current Analysis Behavior

### Side View

Supported when the recording is a strong side view:

- Rep count
- Bottom frame selection per rep
- Depth status:
  - below parallel
  - at parallel
  - above parallel
- Torso lean status:
  - upright
  - moderate lean
  - excessive lean

### Front View

Supported when the recording is a strong front view:

- Knee tracking status:
  - tracking well
  - mild knee cave
  - moderate knee cave
  - severe knee cave

### Output Frames

The backend can return:

- Annotated rep frames for side-view analysis
- An annotated representative frame for front-view knee tracking

## Local Setup

### Prerequisites

- Python 3.10+ (For MediaPipe to run successfully, we use 3.11)
- Node.js 18+
- npm

### 1. Start the Backend

From [`mobility-ai-service`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/mobility-ai-service):

```bash
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn opencv-python mediapipe python-multipart numpy
uvicorn app:app --reload
```

Backend URL:

```text
http://localhost:8000
```

Important note:

- The pose model asset is expected at [`mobility-ai-service/models/pose_landmarker.task`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/mobility-ai-service/models/pose_landmarker.task).

### 2. Start the Frontend

From [`vectra-ui`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/vectra-ui):

```bash
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## API Endpoints

Useful backend endpoints:

- `GET /`
- `POST /login`
- `POST /analyze/squat`
- `POST /analyze` for the earlier legacy prototype flow

## Demo Login

Current first-iteration credentials:

```text
username: admin
password: admin
```

Authentication is handled by the backend login endpoint and is intentionally simple in this iteration.

## Generated Local Artifacts

During local runs, the backend may create:

- `mobility-ai-service/uploads/`
- `mobility-ai-service/frames/`
- `mobility-ai-service/outputs/frames/`

These are generated artifacts and should not be committed.

## Testing

### Backend

```bash
cd mobility-ai-service
./venv/bin/python -m unittest tests.test_side_view_squat_logic tests.test_login_service
```

### Frontend

```bash
cd vectra-ui
npm run build
```

## Notes

- The current implementation is focused on squat analysis only.
- Authentication is demo-only for now and does not use a database.
- Frame annotation is handled in the backend so the same approach can be reused for future lifts or assessments.
- The app is designed to fail more safely when the capture angle is not suitable for trusted rule-based analysis.
