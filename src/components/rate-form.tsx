import { rateTrip } from "@/server/actions/rider";

export function RateForm({ locale, bookingId, next }: { locale: string; bookingId: string; next?: string }) {
  const ar = locale === "ar";
  return (
    <form className="stack" action={rateTrip}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="bookingId" value={bookingId} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <p>{ar ? "كيف كانت الرحلة؟" : "How was the ride?"}</p>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n}>
            <input type="radio" name="rating" value={n} required />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <label>{ar ? "كلمة للسائق" : "A note for the driver"}<input name="comment" /></label>
      <button className="btn" type="submit">{ar ? "أرسل التقييم" : "Send the rating"}</button>
    </form>
  );
}
