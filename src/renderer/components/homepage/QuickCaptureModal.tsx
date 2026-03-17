import { useEffect, useState } from 'react';
import type { CaptureType } from '../../../shared/types';
import { useGraphStore } from '../../store/graphStore';
import { useToastStore } from '../../store/toastStore';

interface QuickCaptureModalProps {
  coursePath: string;
  onClose: () => void;
}

export function QuickCaptureModal({ coursePath, onClose }: QuickCaptureModalProps) {
  const nodes = useGraphStore((state) => state.nodes);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const pushToast = useToastStore((state) => state.pushToast);
  const [captureType, setCaptureType] = useState<CaptureType>('note');
  const [nodeId, setNodeId] = useState<string>(selectedNodeId ?? nodes[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [status, setStatus] = useState('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!nodeId && nodes[0]?.id) {
      setNodeId(nodes[0].id);
    }
  }, [nodeId, nodes]);

  async function handlePickFile() {
    const filePaths = await window.synapse.showOpenDialog();
    if (filePaths[0]) {
      setSourcePath(filePaths[0]);
    }
  }

  async function handleCapture() {
    if (!nodeId) {
      setStatus('Pick a target node first.');
      return;
    }

    setCapturing(true);
    try {
      const screenshotData =
        captureType === 'screenshot' ? await captureScreenshotDataUrl() : content;

      const result = await window.synapse.quickCapture({
        coursePath,
        nodeId,
        type: captureType,
        content: screenshotData,
        sourcePath,
      });

      setStatus(result.message);
      pushToast({
        title: 'Capture saved',
        description: result.message,
        tone: 'success',
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Capture failed';
      setStatus(message);
      pushToast({
        title: 'Capture failed',
        description: message,
        tone: 'error',
      });
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="panel scale-in w-full max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Quick Capture</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Drop new study context anywhere</h2>
          </div>
          <button className="text-sm text-slate-300 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="panel-muted p-3">
            {(['file', 'screenshot', 'note', 'link'] as CaptureType[]).map((type) => (
              <button
                key={type}
                className={`mb-2 w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  captureType === type
                    ? 'border-sky-400 bg-sky-500/10 text-white'
                    : 'border-white/10 text-slate-300 hover:border-white/20'
                }`}
                onClick={() => setCaptureType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <label className="block text-sm text-slate-300">
              Node
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white"
                value={nodeId}
                onChange={(event) => setNodeId(event.target.value)}
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.title}
                  </option>
                ))}
              </select>
            </label>

            {(captureType === 'note' || captureType === 'link') && (
              <label className="block text-sm text-slate-300">
                {captureType === 'note' ? 'Captured note' : 'Link URL'}
                <textarea
                  className="mt-2 h-40 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                />
              </label>
            )}

            {captureType === 'file' && (
              <div className="rounded-xl border border-dashed border-white/10 p-4">
                <p className="text-sm text-slate-300">{sourcePath || 'Choose a file to capture'}</p>
                <button
                  className="mt-3 rounded-full border border-white/10 px-3 py-1 text-sm text-white hover:border-sky-400"
                  onClick={handlePickFile}
                >
                  Choose file
                </button>
              </div>
            )}

            {captureType === 'screenshot' && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                Capture grabs a still frame from the chosen display and stores it directly into the
                node&apos;s `media/` folder.
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{status}</p>
              <div className="flex gap-3">
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm text-white hover:border-sky-300"
                  onClick={() => void handleCapture()}
                  disabled={capturing}
                >
                  {capturing ? 'Capturing...' : 'Capture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function captureScreenshotDataUrl(): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: 1,
    },
    audio: false,
  });

  const [track] = stream.getVideoTracks();
  if (!track) {
    throw new Error('No display track available');
  }

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play();

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1920;
  canvas.height = video.videoHeight || 1080;
  const context = canvas.getContext('2d');
  if (!context) {
    track.stop();
    throw new Error('Canvas context unavailable');
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  track.stop();
  stream.getTracks().forEach((streamTrack) => streamTrack.stop());
  return canvas.toDataURL('image/png');
}
