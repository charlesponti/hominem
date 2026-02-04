/**
 * Type for extracting the success data type from an ApiResult
 *
 * @example
 * type GetUserResult = ApiResult<User>
 * type UserData = ExtractApiData<GetUserResult> // User
 */
export type ExtractApiData<T> = T extends { success: true; data: infer U } ? U : never;
