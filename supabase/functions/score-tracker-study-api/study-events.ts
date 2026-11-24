export type StudyProgress =
  | { stage: 'records' | 'planning' | 'analysis' }
  | { stage: 'tools'; tools: string[] };

export type ProgressListener = (progress: StudyProgress) => void;
type StudyResult = { status: number; data: unknown };

export function studyEventResponse(
  run: (progress: ProgressListener) => Promise<StudyResult>,
  headers: HeadersInit,
  waitUntil?: (task: Promise<void>) => void,
) {
  const encoder = new TextEncoder();
  let running = true;
  let heartbeat: ReturnType<typeof setInterval>;
  const stop = () => {
    running = false;
    clearInterval(heartbeat);
  };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (frame: string) => {
        if (running) controller.enqueue(encoder.encode(frame));
      };
      const event = (name: string, data: unknown) => write('event: ' + name + '\ndata: ' + JSON.stringify(data) + '\n\n');
      heartbeat = setInterval(() => {
        if ((controller.desiredSize ?? 0) > 0) write(': keepalive\n\n');
      }, 12000);
      const done = Promise.resolve().then(() => run(progress => event('progress', progress))).then(
        result => event('result', result),
        error => {
          console.error('study_stream_failed', error instanceof Error ? error.name : 'unknown');
          event('result', { status: 503, data: { error: '回答暂时没加载出来，再试一次' } });
        },
      ).finally(() => {
        if (running) controller.close();
        stop();
      });
      waitUntil?.(done);
    },
    cancel: stop,
  });
  const streamHeaders = new Headers(headers);
  streamHeaders.set('Content-Type', 'text/event-stream; charset=utf-8');
  streamHeaders.set('Cache-Control', 'private, no-store, no-transform');
  return new Response(body, { headers: streamHeaders });
}
