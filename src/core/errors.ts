export type IssueCode =
  | "invalid_type" | "invalid_value" | "too_small" | "too_big"
  | "invalid_string" | "invalid_date" | "invalid_enum_value" | "invalid_union"
  | "invalid_union_discriminator" | "invalid_intersection_types" | "not_multiple_of"
  | "not_finite" | "custom" | "unrecognized_keys" | "invalid_literal"
  | "too_small_set" | "too_big_set" | "not_unique" | "not_nan";

export interface ValiIssue {
  code: IssueCode;
  path: (string | number)[];
  message: string;
  received?: string;
  expected?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  fatal?: boolean;
  unionErrors?: ValiIssue[][];
  keys?: string[];
}

export class ValiError extends Error {
  override readonly name = "ValiError";
  readonly issues: ValiIssue[];

  constructor(issues: ValiIssue[]) {
    super(ValiError.formatMessage(issues));
    this.issues = issues;
    Object.setPrototypeOf(this, ValiError.prototype);
  }

  static formatMessage(issues: ValiIssue[]): string {
    if (issues.length === 1) {
      const issue = issues[0]!;
      const path = issue.path.length > 0 ? ` at "${issue.path.join(".")}"` : "";
      return `${issue.message}${path}`;
    }
    return (
      `${issues.length} validation errors:\n` +
      issues.map((i) => {
        const path = i.path.length > 0 ? ` at "${i.path.join(".")}"` : "";
        return `  • ${i.message}${path}`;
      }).join("\n")
    );
  }

  static create(
    code: IssueCode,
    message: string,
    path: (string | number)[] = [],
    extras: Partial<ValiIssue> = {}
  ): ValiIssue {
    return { code, message, path, ...extras };
  }

  get message(): string {
    return ValiError.formatMessage(this.issues);
  }

  format(): Record<string, unknown> {
    const result: Record<string, unknown> = { _errors: [] as string[] };
    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        (result["_errors"] as string[]).push(issue.message);
      } else {
        let current = result;
        for (let i = 0; i < issue.path.length; i++) {
          const key = String(issue.path[i]!);
          if (i === issue.path.length - 1) {
            if (!current[key]) current[key] = [] as string[];
            (current[key] as string[]).push(issue.message);
          } else {
            if (!current[key] || typeof current[key] !== "object") {
              current[key] = { _errors: [] as string[] };
            }
            current = current[key] as Record<string, unknown>;
          }
        }
      }
    }
    return result;
  }

  flatten(): { formErrors: string[]; fieldErrors: Record<string, string[]> } {
    const formErrors: string[] = [];
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
      } else {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key]!.push(issue.message);
      }
    }
    return { formErrors, fieldErrors };
  }
}

export function getTypeName(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number" && isNaN(value)) return "nan";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (value instanceof Map) return "map";
  if (value instanceof Set) return "set";
  if (value instanceof Promise) return "promise";
  if (typeof value === "bigint") return "bigint";
  return typeof value;
}

// Re-export for backward compat
export type { ValiIssue as Literal };
