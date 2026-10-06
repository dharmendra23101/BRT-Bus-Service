/**
 * Screen-reader announcements.
 *
 * Sighted users learn that a booking succeeded or a bus is arriving from
 * something appearing on screen. A screen reader user only learns it if the
 * change is pushed into a live region. This provider owns the two regions the
 * whole app shares.
 *
 * Two politeness levels, used deliberately:
 *  - "polite" waits for a pause in speech. Correct for status updates.
 *  - "assertive" interrupts. Reserved for errors and things the user must act
 *    on, because interrupting for routine updates is hostile.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Politeness = "polite" | "assertive";

interface AnnouncerValue {
  announce: (message: string, politeness?: Politeness) => void;
}

const AnnouncerContext = createContext<AnnouncerValue>({ announce: () => {} });

export const useAnnounce = (): AnnouncerValue["announce"] =>
  useContext(AnnouncerContext).announce;

export const LiveAnnouncer = ({ children }: { children: ReactNode }) => {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");

  /*
    Every scheduled re-announcement, so none of them outlives the provider.
    Without this a message announced just before a page unmounts sets state on
    a component that is gone - which React tolerates quietly in a browser and
    which, in a torn-down test environment, throws where no test can catch it.
  */
  const pending = useRef<number[]>([]);

  useEffect(
    () => () => {
      pending.current.forEach((timer) => window.clearTimeout(timer));
      pending.current = [];
    },
    []
  );

  /**
   * Clearing before setting matters: a live region only announces when its
   * content *changes*, so re-announcing the identical message (a second
   * failed booking, say) needs the value to pass through empty first.
   */
  const announce = useCallback(
    (message: string, politeness: Politeness = "polite") => {
      const set = politeness === "assertive" ? setAssertive : setPolite;

      set("");

      const timer = window.setTimeout(() => {
        pending.current = pending.current.filter((id) => id !== timer);
        set(message);
      }, 50);

      pending.current.push(timer);
    },
    []
  );

  const value = useMemo<AnnouncerValue>(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>

      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
};
