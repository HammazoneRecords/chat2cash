export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  wipayAccount: string; // The WiPay account/wallet to disburse funds to
  country: string; // TT, JM, BB, etc.
  town?: string;
  age: number;
  gender: string;
  educationLevel?: string;
  school?: string;
  singleParentHome?: boolean;
  demographicOptIn?: boolean;
}

export interface DialogTurn {
  id: string;
  speaker: string;
  originalText: string;
  cleanedText: string;
  isUseful: boolean; // Computed usefulness for training
  explanation?: string; // Reason why is or isn't useful
}

export interface DialoguePair {
  prompt: string;     // Context / Message prior
  response: string;   // Cleaned, safe response
  isUseful: boolean;
  score: number;      // Usefulness score
  category: string;   // Q&A, Smalltalk, Task-oriented, Informational, Noise
}

export interface DatasetMetadata {
  anonymizationRules: string[];
  evaluationSummary: string;
  suitabilityScore: number; // 0-100 score of quality for fine-tuning
  payoutRatePerUsefulLine: number; // e.g. $0.05 TTD per helpful line
  totalLinesAnalyzed: number;
  totalUsefulLines: number;
  uniqueUserTokens: number;
  estimatedTokens: number;
}

export interface TransactionDetails {
  transactionId: string;
  amount: number;
  currency: string;
  gateway: 'WiPay';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  timestamp: string;
  referenceHash: string;
  wipayResponse?: any;
}

export interface ProcessedDataset {
  id: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  originalFileName: string;
  purifiedFileName: string; // whatsapp_dataset_userId_timestamp.[json/csv]
  timestamp: string;
  status: 'Pending Review' | 'Approved' | 'Disbursed' | 'Declined';
  payoutAmount: number; // Estimated amount based on usefulness
  currency: string; // TTD or JMD or BBD or USD
  metadata: DatasetMetadata;
  dialogues: DialoguePair[];
  originalLinesPreview: DialogTurn[]; // raw lines marked with useability
  transaction?: TransactionDetails;
}

export interface WiPayPayoutRequest {
  userId: string;
  datasetId: string;
  accountNumber: string;
  amount: number;
  currency: string;
  phone: string;
}
