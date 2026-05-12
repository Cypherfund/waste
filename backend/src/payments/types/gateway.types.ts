export interface PaymentProvider {
  id: number;
  currency: string;
  dbMaxDepositAmount: number;
  dbMaxWithdrawalAmount: number;
  dbMinDepositAmount: number;
  dbMinWithdrawalAmount: number;
  dtDateCreated: string;
  dtDateUpdated: string | null;
  strDriverClassName: string;
  strImageUrl: string;
  strPaymentCode: string;
  supportedMethods: string[];
  strProviderName: string;
  bcashout: boolean;
  bactive: boolean;
  bcashin: boolean;
}

export interface GatewayInitiateResponse {
  success: boolean;
  message: string;
  data: {
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    transactionId: string;
    data: any | null;
  };
}

export interface GatewayStatusResponse {
  success: boolean;
  message: string;
  data: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface GatewayProvidersResponse {
  success: boolean;
  message: string;
  data: PaymentProvider[];
}
