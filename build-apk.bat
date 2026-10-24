@echo off
set "JAVA_HOME=C:\Users\USER\AppData\Local\jdk-21"
set "PATH=%JAVA_HOME%\bin;C:\Users\USER\AppData\Local\gradle-8.14.3\bin;C:\Users\USER\AppData\Local\Android\Sdk\platform-tools;%PATH%"
set "ANDROID_HOME=C:\Users\USER\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\USER\AppData\Local\Android\Sdk"

echo JAVA_HOME is %JAVA_HOME%
call "%JAVA_HOME%\bin\java.exe" -version

echo.
echo [1/3] Syncing latest web assets to Capacitor Android native project...
cd /d "%~dp0"
call cmd /c "npx cap sync android"

echo.
echo [2/3] Compiling signed release APK with Gradle...
cd /d "%~dp0android"
call "C:\Users\USER\AppData\Local\gradle-8.14.3\bin\gradle.bat" assembleRelease --no-daemon

echo.
echo [3/3] Deploying Chroniq.apk release deliverable...
if exist "%~dp0android\app\build\outputs\apk\release\app-release.apk" (
    copy /Y "%~dp0android\app\build\outputs\apk\release\app-release.apk" "%~dp0Chroniq.apk"
    copy /Y "%~dp0android\app\build\outputs\apk\release\app-release.apk" "%~dp0chroniq.apk"
    copy /Y "%~dp0android\app\build\outputs\apk\release\app-release.apk" "%~dp0dist\Chroniq.apk"
    copy /Y "%~dp0android\app\build\outputs\apk\release\app-release.apk" "%~dp0dist\chroniq.apk"
    copy /Y "%~dp0android\app\build\outputs\apk\release\app-release.apk" "%~dp0public\Chroniq.apk"
    copy /Y "%~dp0android\app\build\outputs\apk\release\app-release.apk" "%~dp0public\chroniq.apk"
    echo SUCCESS: Chroniq.apk created and distributed!
) else (
    echo FAILURE: Release APK build failed.
)
