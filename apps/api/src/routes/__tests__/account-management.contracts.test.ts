import type {
  AccountMessageResponse,
  AccountProfileResponse,
  ChangePasswordRequest,
  DeleteAccountRequest,
  DeleteAccountResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  UpdateAccountProfileRequest,
  VerifyEmailChangeRequest
} from "@testseed/types";
import { createAuthRouter } from "../auth";

void createAuthRouter;

const accountContracts: [
  UpdateAccountProfileRequest,
  VerifyEmailChangeRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  DeleteAccountRequest,
  AccountProfileResponse | AccountMessageResponse | ForgotPasswordResponse | DeleteAccountResponse
] = [
  { displayName: "Mazen", email: "new@testseed.local" },
  { code: "123456" },
  {
    currentPassword: "Current!Pass123",
    newPassword: "Newer!Pass123",
    confirmPassword: "Newer!Pass123"
  },
  { email: "dev@testseed.local" },
  {
    email: "dev@testseed.local",
    code: "123456",
    newPassword: "Newer!Pass123",
    confirmPassword: "Newer!Pass123"
  },
  { currentPassword: "Current!Pass123", confirmationPhrase: "DELETE" },
  { message: "ok" }
];

void accountContracts;
