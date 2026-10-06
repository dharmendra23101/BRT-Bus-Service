import {
  Building2,
  Clapperboard,
  GraduationCap,
  Landmark,
  Stethoscope,
  Trees,
} from "lucide-react";
import type { Place, PlaceCategory } from "@/domain/places";

const CATEGORY_GLYPHS: Record<PlaceCategory, typeof Building2> = {
  Education: GraduationCap,
  Healthcare: Stethoscope,
  Government: Building2,
  Recreation: Trees,
  Tourism: Landmark,
  Entertainment: Clapperboard,
};

/**
 * The picture, or the honest absence of one.
 *
 * No photograph of these places is available to us under a licence we can
 * use: the operator's own images are theirs, Google Places photos may not be
 * cached, and Indian government sites are not openly licensed by default. So
 * rather than a broken frame or somebody else's photograph, a card shows a
 * category glyph - which still tells a rider at a glance whether they are
 * looking at a hospital or a cinema.
 *
 * When a licensed image does arrive it drops in here, with its licence and
 * attribution carried in the data and asserted by the validation suite.
 */
const PlaceGlyph = ({
  place,
  className = "",
}: {
  place: Place;
  className?: string;
}) => {
  if (place.image) {
    return (
      <img
        src={place.image.src}
        alt={place.image.alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  const Glyph = CATEGORY_GLYPHS[place.category];

  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-secondary ${className}`}
    >
      <Glyph className="w-8 h-8 text-primary/70" aria-hidden="true" />
      {/*
        Named for a screen reader, because the glyph is the only thing in the
        frame and "image" would say nothing at all.
      */}
      <span className="sr-only">No photograph available for {place.name}</span>
    </div>
  );
};

export default PlaceGlyph;
