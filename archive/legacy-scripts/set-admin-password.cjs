const readline = require('node:readline/promises');
const {setPassword} = require('../server/admin-auth.cjs');
(async()=>{
  const prompt=readline.createInterface({input:process.stdin,output:process.stdout});
  try{const password=await prompt.question('New admin password (12+ characters): ');setPassword(password);console.log('Updated. Login details: .private/login.txt');}catch(error){console.error(error.message);process.exitCode=1;}finally{prompt.close();}
})();
