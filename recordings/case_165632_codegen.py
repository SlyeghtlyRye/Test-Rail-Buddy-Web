import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://www.phone.com/")
    page.get_by_role("link", name="LOG IN", exact=True).click()
    page.goto("https://accounts.phone.com/?client_id=e53f4ba1-3af0-410d-8861-83759c0b37b0&redirect_uri=https://my.phone.com")
    page.get_by_placeholder("Email or username").click()
    page.get_by_placeholder("Email or username").fill("")
    page.locator("a").filter(has_text="Sign in with extension").click()
    page.get_by_placeholder("Phone.com number").click()
    page.get_by_placeholder("Phone.com number").fill("+1-112")
    page.get_by_placeholder("Extension").click()
    page.get_by_placeholder("Extension").fill("2223")
    page.get_by_placeholder("Voicemail PIN").click()
    page.get_by_placeholder("Voicemail PIN").fill("33333")
    page.get_by_role("button", name="Sign in").click()
    page.get_by_role("button", name="Go back").click()
    page.get_by_placeholder("Phone.com number").click()
    page.get_by_text("Sign in with your email or usernameSign inNeed help signing in?By continuing").click()
    page.locator("a").filter(has_text="Sign in with your email or").click()
    page.get_by_placeholder("Email or username").click()
    page.get_by_placeholder("Email or username").fill("ryan3018@gmail.com")
    page.get_by_placeholder("Email or username").press("Tab")
    page.get_by_placeholder("Password").fill("maell")
    page.get_by_placeholder("Password").press("ControlOrMeta+a")
    page.get_by_placeholder("Password").fill("Phone./c")
    page.get_by_placeholder("Password").press("ControlOrMeta+a")
    page.get_by_placeholder("Password").fill("Phone.com123!")
    page.get_by_role("button", name="Sign in").click()
    page.goto("https://my.phone.com/e1844228/bill-and-pay")
    page.close()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
