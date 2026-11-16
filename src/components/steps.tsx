export function passengerSteps(ar: boolean) {
  return ar ? ["الرقم", "الصورة", "الرحلة", "الاتفاق"] : ["Number", "Photo", "Ride", "Agree"];
}

export function driverSteps(ar: boolean) {
  return ar ? ["أنت", "الأوراق", "الرحلات"] : ["You", "Papers", "Rides"];
}

export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="steps">
      {labels.map((label, index) => {
        const step = index + 1;
        const state = step < current ? "done" : step === current ? "on" : "";
        return (
          <li key={label} className={state} aria-current={step === current ? "step" : undefined}>
            <span />
            {label}
          </li>
        );
      })}
    </ol>
  );
}
