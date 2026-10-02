export const smootherstep = x => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export const damping = (rate, dt) => 1 - Math.exp(-rate * Math.max(0, dt));

export function springStep(position, velocity, target, omega, dt) {
  if (dt <= 0) return [position, velocity];
  const offset = position - target;
  const impulse = velocity + omega * offset;
  const decay = Math.exp(-omega * dt);
  return [
    target + (offset + impulse * dt) * decay,
    (velocity - omega * impulse * dt) * decay,
  ];
}

export function travelEnvelope(progress) {
  return {
    departure: 1 - smootherstep(progress / .28),
    arrival: smootherstep((progress - .62) / .38),
  };
}

export function sceneReveal(current, target, dt, reduced = false) {
  if (reduced) return target;
  const next = current + (target - current) * damping(5.5, dt);
  return Math.abs(next - target) < .001 ? target : next;
}
