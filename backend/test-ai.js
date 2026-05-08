const runTests = async () => {
    console.log("=== STARTING AI AUTONOMOUS EVALUATION TEST ===\n");
    try {
      // 1. Fetch Auth Token
      const authRes = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@test.com", password: "password", role: "student" }),
      });
      const authData = await authRes.json();
      const token = authData.data.token;
  
      if (!token) throw new Error("Failed to authenticate test rig");
  
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };
  
      // Base abstract payload
      const basePayload = {
        category: "Technical",
        title: "Test AI Submission",
        date: "2024-04-10",
      };
  
      // TEST 1: Missing Document (Should Reject)
      console.log("→ Test 1: Submitting Activity without Document...");
      let res1 = await fetch("http://localhost:5000/api/student/activity", {
        method: "POST", headers,
        body: JSON.stringify({ ...basePayload, title: "Empty Submission", certificate_url: "" }),
      });
      let data1 = await res1.json();
      console.log(`Result: ${data1.data.verification_status} | Reason: ${data1.data.ai_reason}\n`);
  
      // TEST 2: High Trust Document (Should Approve)
      console.log("→ Test 2: Submitting Valid Trusted AWS Cloud Certificate...");
      let res2 = await fetch("http://localhost:5000/api/student/activity", {
        method: "POST", headers,
        body: JSON.stringify({ ...basePayload, title: "AWS Solutions Architect", certificate_url: "https://aws.amazon.com/certificate/123456" }),
      });
      let data2 = await res2.json();
      console.log(`Result: ${data2.data.verification_status} | Reason: ${data2.data.ai_reason}\n`);
  
      // TEST 3: Suspicious Document (Should Reject)
      console.log("→ Test 3: Submitting Highly Suspicious/Fake Document payload...");
      let res3 = await fetch("http://localhost:5000/api/student/activity", {
        method: "POST", headers,
        body: JSON.stringify({ ...basePayload, title: "Hacked Script", certificate_url: "http://fake-domain.com/hacked.pdf" }),
      });
      let data3 = await res3.json();
      console.log(`Result: ${data3.data.verification_status} | Reason: ${data3.data.ai_reason}\n`);
  
    } catch (e) {
      console.error(e);
    }
  };
  
  runTests();
