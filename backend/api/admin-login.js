export default function handler(req, res) {
  const { password } = req.query;

  if (!password) {
    return res.status(400).json({ success: false, message: "Password required" });
  }

  if (password !== "Fire1234") {
    return res.status(401).json({ success: false, message: "Invalid password" });
  }

  res.status(200).json({ success: true, token: "ADMIN_AUTH_SUCCESS" });
}
