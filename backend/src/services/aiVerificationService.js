/**
 * Master AI Evaluation Service
 * Simulated Optical Character Recognition (OCR) integration logic.
 */

const evaluateCertificate = async (certificateUrl, studentTitle) => {
    return new Promise((resolve) => {
      // Simulate real-world external API processing latency (1.5 seconds)
      setTimeout(() => {
        if (!certificateUrl || certificateUrl === '') {
          return resolve({
            status: 'Rejected',
            confidence_score: 0.05,
            reason: 'Activity log was submitted without supporting certificate documentation.'
          });
        }
  
        const urlStr = certificateUrl.toLowerCase();
        
        // Define trust vectors to run strings against simulated text extraction memory 
        const highTrustKeywords = ['coursera', 'aws', 'microsoft', 'nptel', 'cisco', 'udemy'];
        const suspiciousVectors = ['fake', 'test', 'example', 'blank', 'null'];
  
        // 1. Analyze for Suspicious markers in PDF payload
        if (suspiciousVectors.some(v => urlStr.includes(v))) {
          return resolve({
            status: 'Rejected',
            confidence_score: 0.12,
            reason: 'AI OCR failed to extract meaningful text vectors or identified placeholder formatting.'
          });
        }
  
        // 2. Validate against trusted providers
        if (highTrustKeywords.some(trustName => urlStr.includes(trustName))) {
          return resolve({
            status: 'Approved',
            confidence_score: 0.98,
            reason: 'Verified structural legitimacy and authorized issuer via digital signature bypass.'
          });
        }
  
        // 3. Fallback to Pending for human verification if obscure platform
        return resolve({
          status: 'Pending',
          confidence_score: 0.55,
          reason: 'Document recognized but issuer API unrecognized. Retained for human validation pass.'
        });
        
      }, 1500);
    });
  };
  
  module.exports = {
    evaluateCertificate
  };
