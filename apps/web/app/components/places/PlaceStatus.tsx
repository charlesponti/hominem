import type { Place } from '@hominem/services/places';
import type { HTMLAttributes } from 'react';

type WrapProps = HTMLAttributes<HTMLParagraphElement>;
const Wrap = ({ children, ...props }: WrapProps) => <p {...props}>{children}</p>;

type PlaceStatusProps = WrapProps & {
  businessStatus: Place['businessStatus'];
  openingHours: Place['openingHours'];
};

type GooglePlaceOpeningHours = {
  weekday_text: string[];
  periods: {
    open: {
      day: number;
      hours: number;
      minutes: number;
    };
    close: {
      day: number;
      hours: number;
      minutes: number;
    };
  }[];
};

const PlaceStatus = ({ businessStatus, openingHours, ...props }: PlaceStatusProps) => {
  // Parse openingHours JSON string (Google Places API format)
  let openingHoursObj: GooglePlaceOpeningHours | null = null;
  try {
    openingHoursObj = openingHours ? JSON.parse(openingHours) : null;
  } catch {
    openingHoursObj = null;
  }

  // Helper: isOpen logic (Google API returns periods, but not isOpen function)
  // We'll use current day and time to estimate open status if possible
  const weekdayText: string[] = openingHoursObj?.weekday_text || [];
  const todayIdx = new Date().getDay();
  let isOpen: boolean | undefined;
  if (openingHoursObj?.periods) {
    const now = new Date();
    const todayPeriods = openingHoursObj.periods.filter((p) => p.open?.day === todayIdx);
    isOpen = todayPeriods.some((p) => {
      if (!(p.open && p.close)) {
        return false;
      }
      const openHour = p.open.hours;
      const openMin = p.open.minutes || 0;
      const closeHour = p.close.hours;
      const closeMin = p.close.minutes || 0;
      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;
      const nowTime = now.getHours() * 60 + now.getMinutes();
      return nowTime >= openTime && nowTime < closeTime;
    });
  }

  if (!businessStatus) {
    return null;
  }

  if (businessStatus === 'OPERATIONAL') {
    if (isOpen) {
      return (
        <Wrap {...props}>
          <span className="text-green-500 font-semibold mr-2">Open today</span>
          <br />
          {weekdayText[todayIdx]?.replace(/[a-zA-Z]+: /, '').replace(/–/g, ' to ') ||
            'Hours not available'}
        </Wrap>
      );
    }

    // Find next open day
    const nextDayIdx = (todayIdx + 1) % 7;
    const nextDayText = weekdayText[nextDayIdx]?.replace(/: /, ' at ').replace(/–/g, ' to ');

    return (
      <Wrap {...props}>
        <span className="text-red-500 font-semibold">Closed</span>{' '}
        <span>
          <span>Opens again </span>
          {nextDayText || 'soon'}
        </span>
      </Wrap>
    );
  }

  if (businessStatus === 'CLOSED_PERMANENTLY') {
    return (
      <Wrap {...props}>
        <span className="font-semibold">Permanently Closed</span> 😢
      </Wrap>
    );
  }

  if (businessStatus === 'CLOSED_TEMPORARILY') {
    return (
      <Wrap {...props}>
        <span className="font-semibold">Temporarily Closed but will return</span> 🤞
      </Wrap>
    );
  }

  return (
    <Wrap {...props}>
      <span className="font-semibold">Status:</span> {businessStatus}
    </Wrap>
  );
};

export default PlaceStatus;
