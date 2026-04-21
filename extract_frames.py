import cv2
import os

video_path = r"C:\Users\barca2\Downloads\Grabación 2026-04-20 164814 buzon.mp4"
output_dir = "artifacts_frames"
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("Error opening video")
    exit()

total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
dur = total_frames / fps
print(f"Video {dur} seconds")

# Grab 6 frames
interval = total_frames // 6
for i in range(1, 6):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i * interval)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(os.path.join(output_dir, f"frame_{i}.jpg"), frame)
        print(f"Saved frame {i}")

cap.release()
