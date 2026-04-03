import type { ValiIssue } from "./errors.js";

export type ParseSuccess<T> = {
  readonly success: true;
  readonly data: T;
};

export type ParseFailure = {
  readonly success: false;
  readonly errors: ValiIssue[];
};

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export function ok<T>(data: T): ParseSuccess<T> {
  return { success: true, data };
}

export function fail(errors: ValiIssue[]): ParseFailure {
  return { success: false, errors };
}

export function isOk<T>(result: ParseResult<T>): result is ParseSuccess<T> {
  return result.success === true;
}

export function isFail<T>(result: ParseResult<T>): result is ParseFailure {
  return result.success === false;
}
