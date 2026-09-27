import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: '/test-route' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format HttpException into standardized JSON response', () => {
    const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        path: '/test-route',
        message: 'Forbidden resource',
        error: 'Forbidden',
      }),
    );
    expect(mockJson.mock.calls[0][0].timestamp).toBeDefined();
  });

  it('should format non-HttpException errors as 500 Internal Server Error', () => {
    const exception = new Error('Database connection failed');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/test-route',
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );
  });
});
