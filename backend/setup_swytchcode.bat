@echo off
REM ============================================================
REM  Swytchcode Setup Script for SwytchAgent Day Planner
REM  Run this ONCE before starting the agent.
REM ============================================================

echo.
echo  ======================================================
echo   Swytchcode Setup - SwytchAgent Day Planner (Track 5)
echo  ======================================================
echo.

REM 1. Initialize Swytchcode project
echo [1/4] Initializing Swytchcode project...
call swy init
echo.

REM 2. Authenticate
echo [2/4] Logging in to Swytchcode...
call swy login
echo.

REM 3. Fetch integration bundles
echo [3/4] Fetching integration bundles...
call swy get gmail
call swy get notion
call swy get jira
call swy get resend
call swy get github
call swy get slack
echo.

REM 4. Connect provider auth
echo [4/4] Connecting provider authentication...
call swy auth connect gmail
call swy auth connect notion
call swy auth connect jira
call swy auth connect resend
call swy auth connect github
call swy auth connect slack
echo.

echo  ======================================================
echo   Setup complete! Run: python main.py --demo
echo  ======================================================
