@echo off
REM ============================================================
REM  Swytchcode Setup Script for AI Customer Support Agent
REM  Run this ONCE before starting the agent.
REM ============================================================

echo.
echo  ==========================================
echo   Swytchcode Setup - Support Agent
echo  ==========================================
echo.

REM 1. Initialize Swytchcode project
echo [1/5] Initializing Swytchcode project...
call swy init
echo.

REM 2. Authenticate
echo [2/5] Logging in to Swytchcode...
call swy login
echo.

REM 3. Fetch all 5 integration bundles
echo [3/5] Fetching integration bundles...
call swy get gmail
call swy get notion
call swy get jira
call swy get resend
call swy get github
echo.

REM 4. Enable specific tools
echo [4/5] Enabling tools...
call swy add gmail.messages.list
call swy add gmail.messages.get
call swy add notion.databases.query
call swy add notion.pages.retrieve
call swy add jira.issue.create
call swy add jira.issue.search
call swy add resend.emails.send
call swy add github.issue.create
call swy add github.issue.list
echo.

REM 5. Connect provider auth
echo [5/5] Connecting provider authentication...
call swy auth connect gmail
call swy auth connect notion
call swy auth connect jira
call swy auth connect resend
call swy auth connect github
echo.

echo  ==========================================
echo   Setup complete! Run: python main.py
echo  ==========================================
