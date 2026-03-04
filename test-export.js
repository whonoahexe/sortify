const cookie = "spotify_access_token=BQCaqx0wYfgTXLqTa-UB8rOfBYdLqOg9N68xHRin-mHPfsw7GJDqKL74Y2JgqJEtuAuMeAwbcumCLsBJIJmmHtOSCvCHfEV4l_qYrDhs6fxFGSecJALArEntqxCknXR1KVxqkANc1PekLouSk4km0btl23fiI6z48zlK68tn8WwDi0lvUtwSgQaRq8-5mZU-0NQbTJ-t0kQ-QWQbZxdDqXbsfA7FZGWiv_8puBj7lVVrs_a-a8RaPARuMyftBvKy5HldU5QRJay2RidwwsE46cc6QehIkZgLjC2cnMIV8GGFO4Q1ag; spotify_token_expiry=1772641121201; spotify_refresh_token=AQC-f8Uk9EDWPn1iDzwJ3O0KvkvAnndXKK2_Vm5GwFTIE6FLHG2NvK_4qka_qif4EGk0wLL5ug_8C_OVHSJdVe-ICsPrVPPyA15EE9i5ycNHZCpK3RYaGFP_9-k8me_aWG8";

async function test() {
  const token = cookie.split('spotify_access_token=')[1].split(';')[0];
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const me = await meRes.json();
  console.log("User ID:", me.id);

  const res = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      name: "Test Album",
      description: "testing",
      public: false
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
test();
