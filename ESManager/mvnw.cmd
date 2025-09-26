@ECHO OFF
SETLOCAL
SET "DIR=%~dp0"
IF "%DIR%"=="" SET "DIR=%CD%"
IF "%DIR:~-1%"=="\" SET "DIR=%DIR:~0,-1%"
SET "WRAPPER_JAR=%DIR%\.mvn\wrapper\maven-wrapper.jar"
SET "WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain"
IF EXIST "%JAVA_HOME%\bin\java.exe" (
  SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) ELSE (
  SET "JAVA_EXE=java"
)
"%JAVA_EXE%" -Dmaven.multiModuleProjectDirectory="%DIR%" -cp "%WRAPPER_JAR%" %WRAPPER_LAUNCHER% %*
ENDLOCAL
