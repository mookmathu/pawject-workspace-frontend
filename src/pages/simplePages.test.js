import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFoundPage from "./NotFoundPage";
import OAuthCallbackPage from "./OAuthCallbackPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import * as api from "../lib/api";

jest.mock("../lib/api");

const mockNavigate = require("../testUtils/routerMock").navigate;
jest.mock("react-router-dom", () => require("../testUtils/routerMock"));

const at = (search) => window.history.pushState({}, "", search);
const wrap = (ui) => render(ui);

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  mockNavigate.mockClear();
  at("/");
});

describe("NotFoundPage", () => {
  it("says the page is missing and links home", () => {
    wrap(<NotFoundPage />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "กลับหน้าแรก" })).toHaveAttribute("href", "/");
  });
});

describe("OAuthCallbackPage", () => {
  it("shows an error when there is no token", async () => {
    wrap(<OAuthCallbackPage />);
    expect(await screen.findByText(/ไม่พบ token/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("กลับไปหน้าเข้าสู่ระบบ"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("stores the session and goes to the welcome page", async () => {
    at("/oauth-callback?token=abc&needsProfile=false");
    api.getMe.mockResolvedValue({ user: { id: "u1" } });
    wrap(<OAuthCallbackPage />);
    expect(screen.getByText("กำลังเข้าสู่ระบบ...")).toBeInTheDocument();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/welcome", { replace: true }));
    expect(localStorage.getItem("crew_token")).toBe("abc");
    expect(JSON.parse(localStorage.getItem("crew_user"))).toEqual({ id: "u1" });
  });

  it("sends first-time social users to finish their profile", async () => {
    at("/oauth-callback?token=abc&needsProfile=true");
    api.getMe.mockResolvedValue({ user: { id: "u1" } });
    wrap(<OAuthCallbackPage />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/complete-profile", { replace: true }));
  });

  it("shows the server's error if the token is rejected", async () => {
    at("/oauth-callback?token=bad");
    api.getMe.mockRejectedValue(new Error("เซสชันหมดอายุ"));
    wrap(<OAuthCallbackPage />);
    expect(await screen.findByText("เซสชันหมดอายุ")).toBeInTheDocument();
  });
});

describe("ForgotPasswordPage", () => {
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "ส่งลิงก์รีเซ็ตรหัสผ่าน" }));
  const type = (v) => fireEvent.change(screen.getByPlaceholderText("username@gmail.com"), { target: { value: v } });

  it("validates the email before sending", () => {
    wrap(<ForgotPasswordPage />);
    submit();
    expect(screen.getByText("กรุณากรอกอีเมล")).toBeInTheDocument();
    type("not-an-email");
    submit();
    expect(screen.getByText("รูปแบบอีเมลไม่ถูกต้อง")).toBeInTheDocument();
    expect(api.forgotPassword).not.toHaveBeenCalled();
  });

  it("sends the trimmed email and shows the confirmation", async () => {
    api.forgotPassword.mockResolvedValue({});
    wrap(<ForgotPasswordPage />);
    type("  a@b.co ");
    submit();
    expect(await screen.findByText(/มีอยู่ในระบบ/)).toBeInTheDocument();
    expect(api.forgotPassword).toHaveBeenCalledWith("a@b.co");
    expect(screen.getByText("a@b.co")).toBeInTheDocument();
  });

  it("shows the server error and re-enables the button", async () => {
    api.forgotPassword.mockRejectedValue(new Error("server down"));
    wrap(<ForgotPasswordPage />);
    type("a@b.co");
    submit();
    expect(await screen.findByText("server down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ส่งลิงก์รีเซ็ตรหัสผ่าน" })).toBeEnabled();
  });
});

describe("ResetPasswordPage", () => {
  const fill = (a, b) => {
    fireEvent.change(screen.getByPlaceholderText("อย่างน้อย 8 ตัวอักษร"), { target: { value: a } });
    fireEvent.change(screen.getByPlaceholderText("พิมพ์อีกครั้ง"), { target: { value: b } });
    fireEvent.click(screen.getByRole("button", { name: "ตั้งรหัสผ่านใหม่" }));
  };

  it("rejects links without an email or token", () => {
    wrap(<ResetPasswordPage />);
    expect(screen.getByText(/ลิงก์นี้ไม่ถูกต้อง/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ขอลิงก์ใหม่" })).toHaveAttribute("href", "/forgot-password");
  });

  it("validates length and confirmation", () => {
    at("/reset-password?email=a@b.co&token=t");
    wrap(<ResetPasswordPage />);
    fill("", "");
    expect(screen.getByText("กรุณากรอกรหัสผ่านใหม่")).toBeInTheDocument();
    fill("short", "other");
    expect(screen.getByText("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")).toBeInTheDocument();
    expect(screen.getByText("รหัสผ่านไม่ตรงกัน")).toBeInTheDocument();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it("resets the password and offers to sign in", async () => {
    at("/reset-password?email=a@b.co&token=t");
    api.resetPassword.mockResolvedValue({});
    wrap(<ResetPasswordPage />);
    fill("longenough", "longenough");
    expect(await screen.findByText(/ตั้งรหัสผ่านใหม่สำเร็จแล้ว/)).toBeInTheDocument();
    expect(api.resetPassword).toHaveBeenCalledWith({ email: "a@b.co", token: "t", newPassword: "longenough" });
    fireEvent.click(screen.getByText("ไปหน้าเข้าสู่ระบบ"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows an expired-link error from the server", async () => {
    at("/reset-password?email=a@b.co&token=t");
    api.resetPassword.mockRejectedValue(new Error("ลิงก์หมดอายุแล้ว"));
    wrap(<ResetPasswordPage />);
    fill("longenough", "longenough");
    await waitFor(() => expect(screen.getByText("ลิงก์หมดอายุแล้ว")).toBeInTheDocument());
  });
});
