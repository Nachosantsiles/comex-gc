@echo off
PowerShell -Command "Start-Process PowerShell -ArgumentList '-Command New-NetFirewallRule -DisplayName ''COMEX GC ARG Puerto 3010'' -Direction Inbound -Protocol TCP -LocalPort 3010 -Action Allow' -Verb RunAs"
echo Listo. Ya podés cerrar esta ventana.
pause
