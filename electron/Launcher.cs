using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Runtime.InteropServices;

namespace EmailClient
{
    class Program
    {
        [DllImport("shell32.dll")]
        static extern int ShellExecute(int hwnd, string lpOperation, string lpFile, string lpParameters, string lpDirectory, int nShowCmd);

        static void Main(string[] args)
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverPath = Path.Combine(exeDir, "server.cjs");
            string nodePath = Path.Combine(exeDir, "node.exe");

            // Use bundled node.exe if exists, otherwise use system node
            if (!File.Exists(nodePath))
            {
                try
                {
                    // Try to find system node
                    var psi = new ProcessStartInfo("where", "node")
                    {
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    var p = Process.Start(psi);
                    p.WaitForExit();
                    nodePath = p.StandardOutput.ReadToEnd().Trim().Split(new[] { "\r\n", "\n" }, StringSplitOptions.None)[0];
                }
                catch
                {
                    Console.WriteLine("Error: node.exe not found. Please install Node.js or place node.exe alongside EmailClient.exe.");
                    Console.ReadLine();
                    return;
                }
            }

            if (!File.Exists(serverPath))
            {
                Console.WriteLine("Error: server.cjs not found in " + exeDir);
                Console.ReadLine();
                return;
            }

            Console.WriteLine("Starting Email Client...");

            // Set environment variables
            var envVars = new System.Collections.Generic.Dictionary<string, string>
            {
                { "SERVE_STATIC", "true" },
                { "PORT", "3001" },
                { "STATIC_PATH", Path.Combine(exeDir, "dist") }
            };

            // Start the server
            var startInfo = new ProcessStartInfo
            {
                FileName = nodePath,
                Arguments = "\"" + serverPath + "\"",
                UseShellExecute = false,
                CreateNoWindow = false,
                WorkingDirectory = exeDir
            };

            foreach (var kv in envVars)
            {
                startInfo.EnvironmentVariables[kv.Key] = kv.Value;
            }

            try
            {
                var serverProcess = Process.Start(startInfo);
                Console.WriteLine("Server started (PID: " + serverProcess.Id + ")");

                // Wait for server to be ready
                Thread.Sleep(3000);

                // Open browser
                string url = "http://localhost:3001";
                Console.WriteLine("Opening browser at: " + url);
                ShellExecute(0, "open", url, "", "", 1);

                // Wait for server process to exit
                serverProcess.WaitForExit();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
                Console.ReadLine();
            }
        }
    }
}
