import { useId } from "react";
import { STOPS, type StopName } from "@/domain/transit/stops";
import { useTranslation } from "@/contexts/LocaleContext";

interface StopFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Kept out of the suggestions, so a stop cannot be picked twice. */
  exclude?: StopName | "";
}

const StopField = ({ label, value, onChange, exclude }: StopFieldProps) => {
  const { t } = useTranslation();

  const ids = useId();
  const fieldId = `${ids}-stop`;
  const listId = `${ids}-stops`;

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-foreground mb-1"
      >
        {label}
      </label>

      <input
        id={fieldId}
        list={listId}
        type="text"
        value={value}
        autoComplete="off"
        placeholder={t("stopField.placeholder")}
        onChange={(event) => onChange(event.target.value)}
        className="brt-input touch-target"
      />

      <datalist id={listId}>
        {STOPS.filter((stop) => stop !== exclude).map((stop) => (
          <option key={stop} value={stop} />
        ))}
      </datalist>
    </div>
  );
};

export default StopField;
