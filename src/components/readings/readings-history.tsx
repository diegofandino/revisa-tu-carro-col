import { formatDate, formatKm } from "@/lib/format";
import { READINGS_PAGE_SIZE } from "@/lib/validation/constants/reading";
import type { FormState } from "@/server/forms/form-state";
import type { ReadingItem } from "@/server/repositories/readings";
import { ChangeReadingDialog } from "./change-reading-dialog";

interface ReadingsHistoryProps {
  readings: ReadingItem[];
  changeAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  today: string;
  editable: boolean;
}

export function ReadingsHistory({ readings, changeAction, today, editable }: ReadingsHistoryProps) {
  return (
    <section aria-labelledby="readings-title">
      <h2 id="readings-title" className="section-title">
        Historial de lecturas
      </h2>
      <ol className="readings-list">
        {readings.map((reading) => (
          <li key={reading.id} className="reading-item">
            <div>
              <p className="reading-km">{formatKm(reading.km)}</p>
              <p className="vehicle-card-meta">
                {formatDate(reading.readingDate)} · {reading.source === "service" ? "De un servicio" : "Manual"}
              </p>
              {reading.correctionReason ? (
                <p className="vehicle-card-meta">Corregida: {reading.correctionReason}</p>
              ) : null}
            </div>
            {editable && reading.source === "manual" ? (
              <ChangeReadingDialog reading={reading} action={changeAction} today={today} />
            ) : null}
          </li>
        ))}
      </ol>
      {readings.length === READINGS_PAGE_SIZE ? (
        <p className="vehicle-card-meta">Se muestran las {READINGS_PAGE_SIZE} lecturas más recientes.</p>
      ) : null}
    </section>
  );
}
