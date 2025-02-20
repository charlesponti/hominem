type TransportMethod = "car" | "bus" | "train" | "plane";

interface TripCost {
  type: "transportation" | "accommodation";
  cost: number;
}

interface CalculateTripCostsParams {
  needsTransportation: boolean;
  needsAccommodation: boolean;
  startingPoint: string;
  destination: string;
  method: TransportMethod;
  location: string;
}
async function calculateTripCosts({
  needsTransportation,
  needsAccommodation,
  startingPoint,
  destination,
  method,
  location,
}: CalculateTripCostsParams): Promise<TripCost[]> {
  const results: TripCost[] = [];

  if (needsTransportation) {
    const transportationCost = await calculateTransportationCosts({
      startingPoint,
      destination,
      method,
    });
    results.push(transportationCost);
  }

  if (needsAccommodation) {
    const accommodationCost = await calculateAccommodationCosts({ location });
    results.push(accommodationCost);
  }

  return results;
}

interface CalculateTransportationCostsParams {
  startingPoint: string;
  destination: string;
  method: TransportMethod;
}
async function calculateTransportationCosts(
  params: CalculateTransportationCostsParams
): Promise<TripCost> {
  return new Promise((resolve, reject) => {
    let cost = 0;

    switch (params.method) {
      case "car":
        cost = 100;
        break;
      case "bus":
        cost = 300;
        break;
      case "train":
        cost = 200;
        break;
      case "plane":
        break;
    }

    setTimeout(() => {
      resolve({ type: "transportation", cost: 1000 });
    }, 1000);
  });
}

interface CalculateAccommodationCostsParams {
  location: string;
}
function calculateAccommodationCosts(
  params: CalculateAccommodationCostsParams
): Promise<TripCost> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ type: "accommodation", cost: 500 });
    }, 1000);
  });
}

interface FareDetectiveFlightData {
  airportname: string;
  // [{year: "Jan↵2024", price: "707.9"}, {year: "Feb↵2024", price: "578.2"},…]
  chart_data: { year: string; price: string }[];
}

interface GetHistoricalFlightDataParams {
  origin: string;
  departure: string;
}
async function getHistoricalFlightData({
  origin,
  departure,
}: GetHistoricalFlightDataParams) {
  const response = await fetch(
    "https://www.faredetective.com/faredetective/chart_data",
    {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        cookie: "ci_session=8679afd5368ce911aef15e29f9bb21a7738c6acd",
        Referer:
          "https://www.faredetective.com/farehistory/flights-from-Los_Angeles-LAX-to-London-LHR.html",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: new URLSearchParams({ arrival: origin, departure }).toString(),
      method: "POST",
    }
  );

  const body = (await response.json()) as FareDetectiveFlightData;

  return body;
}
