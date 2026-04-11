import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { config } from "../config/env";


export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    ...(config.nodeEnv === "development" && { stack: err.stack }),
  });
}