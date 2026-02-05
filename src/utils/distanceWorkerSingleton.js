let worker = null;

export function getDistanceWorker() {
  if (!worker) {
    worker = new Worker(new URL("./distanceWorker.js", import.meta.url), {
      type: "module",
    });
  }
  return worker;
}
