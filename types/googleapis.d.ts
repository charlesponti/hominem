type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

declare module 'googleapis' {
  export namespace Auth {
    class OAuth2Client {
      constructor(clientId?: string, clientSecret?: string, redirectUri?: string)
      setCredentials(credentials: { access_token?: string; refresh_token?: string | null }): void
      refreshAccessToken(): Promise<{ credentials: { access_token?: string; expiry_date?: number } }>
    }
  }

  export interface APIResponse<T> {
    data: T
  }

  export namespace calendar_v3 {
    interface Schema$Event {
      id?: string
      summary?: string
      description?: string
      updated?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }

    interface Schema$CalendarListEntry {
      id?: string
      summary?: string
    }

    interface Params$Resource$Events$List {
      calendarId: string
      timeMin?: string
      timeMax?: string
      maxResults?: number
      singleEvents?: boolean
      orderBy?: string
      pageToken?: string
    }

    interface Params$Resource$Events$Update {
      calendarId: string
      eventId: string
      requestBody: { [key: string]: JSONValue }
    }

    interface Params$Resource$Events$Insert {
      calendarId: string
      requestBody: { [key: string]: JSONValue }
    }

    interface Params$Resource$Events$Delete {
      calendarId: string
      eventId: string
    }

    interface EventsResource {
      list(params: Params$Resource$Events$List): Promise<APIResponse<{ items?: Schema$Event[]; nextPageToken?: string }>>
      update(params: Params$Resource$Events$Update): Promise<APIResponse<{ id?: string }>>
      insert(params: Params$Resource$Events$Insert): Promise<APIResponse<{ id?: string }>>
      delete(params: Params$Resource$Events$Delete): Promise<APIResponse<{}>>
    }

    interface CalendarListResource {
      list(): Promise<APIResponse<{ items?: Schema$CalendarListEntry[] }>>
    }

    interface Calendar {
      events: EventsResource
      calendarList: CalendarListResource
    }
  }

  export namespace places_v1 {
    interface Schema$GoogleMapsPlacesV1Place {
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
      location?: { latitude?: number; longitude?: number }
      types?: string[]
      rating?: number
      websiteUri?: string
      nationalPhoneNumber?: string
      priceLevel?: string | number
      photos?: Schema$GoogleMapsPlacesV1Photo[]
      addressComponents?: Schema$GoogleMapsPlacesV1PlaceAddressComponent[]
    }

    interface Schema$GoogleMapsPlacesV1PlaceAddressComponent {
      longText?: string
      shortText?: string
      types?: string[]
    }

    interface Schema$GoogleMapsPlacesV1Photo {
      name?: string
      widthPx?: number
      heightPx?: number
    }

    interface Schema$AutocompleteResponse {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string
          text?: { text?: string }
          structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
          types?: string[]
          distanceMeters?: number
        }
      }>
    }

    interface Schema$GoogleMapsPlacesV1SearchTextRequest {
      textQuery: string
      maxResultCount?: number
      locationBias?: { circle?: { center: { latitude: number; longitude: number }; radius: number } }
    }

    interface Schema$GoogleMapsPlacesV1AutocompletePlacesRequest {
      input: string
      sessionToken?: string
      locationBias?: { circle?: { center: { latitude: number; longitude: number }; radius: number } }
      includeQueryPredictions?: boolean
      includedPrimaryTypes?: string[]
    }

    interface Schema$GoogleMapsPlacesV1AutocompletePlacesResponseSuggestion {
      placePrediction?: {
        placeId?: string
        text?: { text?: string }
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
        types?: string[]
        distanceMeters?: number
      }
    }

    interface Schema$SearchTextResponse {
      places?: Schema$GoogleMapsPlacesV1Place[]
    }

    interface Schema$SearchNearbyResponse {
      places?: Schema$GoogleMapsPlacesV1Place[]
    }

    interface PlacesResource {
      get(
        params: { name: string },
        options?: { headers?: Record<string, string> },
      ): Promise<APIResponse<Schema$GoogleMapsPlacesV1Place>>
      autocomplete(
        params: {
          requestBody: Schema$GoogleMapsPlacesV1AutocompletePlacesRequest
        },
        options?: { headers?: Record<string, string> },
      ): Promise<APIResponse<Schema$AutocompleteResponse>>
      searchText(
        params: {
          requestBody: Schema$GoogleMapsPlacesV1SearchTextRequest
        },
        options?: { headers?: Record<string, string> },
      ): Promise<APIResponse<Schema$SearchTextResponse>>
      searchNearby(
        params: {
          locationRestriction?: { circle?: { center: { latitude: number; longitude: number }; radius: number } }
          maxResultCount?: number
          rankPreference?: string
        },
        options?: { headers?: Record<string, string> },
      ): Promise<APIResponse<Schema$SearchNearbyResponse>>
      photos: {
        getMedia(params: {
          name: string
          maxWidthPx?: number
          maxHeightPx?: number
          skipHttpRedirect?: boolean
        }): Promise<APIResponse<{ photoUri?: string }>>
      }
    }

    interface PlacesClient {
      places: PlacesResource
    }
  }

  export const google: {
    calendar(options: { version: 'v3'; auth: Auth.OAuth2Client }): calendar_v3.Calendar
    places(options: { version: 'v1'; auth: string }): places_v1.PlacesClient
  }
}
