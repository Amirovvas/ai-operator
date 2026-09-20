interface IApiErrors {
  badRequest: (message: string) => IResponse;
  notFound: (message: string) => IResponse;
  unauthorized: (message: string) => IResponse;
  forbidden: (message: string) => IResponse;
  conflict: (message: string) => IResponse;
  limit: (message: string) => IResponse;
  unavailable: (message: string) => IResponse;
}
interface IResponse {
  message: string;
  status: number;
}

export const apiErrors: IApiErrors = {
  badRequest: (message = "Bad Request") => {
    return {
      status: 400,
      message,
    };
  },
  notFound: (message = "Not found") => {
    return {
      status: 404,
      message,
    };
  },
  unauthorized: (message = "unauthorized") => {
    return {
      status: 401,
      message,
    };
  },
  forbidden: (message = "forbidden") => {
    return {
      status: 403,
      message,
    };
  },
  conflict: (message = "conflict") => {
    return {
      status: 409,
      message,
    };
  },
  limit: (message = "Too many requests") => {
    return {
      status: 429,
      message,
    };
  },
  unavailable: (message = "Service unavailable") => {
    return {
      status: 503,
      message,
    };
  },
};
