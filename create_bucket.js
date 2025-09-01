// JavaScript code to create a storage bucket and set permissions
// Run this in your browser console while logged into Supabase
async function createBucket() {
  // Get your Supabase URL and anon key from the browser's localStorage
  const supabaseUrl = localStorage.getItem('supabase.auth.token')?.split('::')[0] || prompt('Enter your Supabase URL');
  const supabaseKey = JSON.parse(localStorage.getItem('supabase.auth.token'))?.currentSession?.access_token || prompt('Enter your Supabase anon key');

  // Create the bucket
  const createBucketResponse = await fetch(, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 
    },
    body: JSON.stringify({
      id: 'maps',
      name: 'maps',
      public: true
    })
  });

  console.log('Create bucket response:', await createBucketResponse.json());
}

createBucket().catch(console.error);
