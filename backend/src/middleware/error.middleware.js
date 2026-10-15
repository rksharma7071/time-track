export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON." });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large." });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for "${err.path}".` });
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((e) => e.message).join(" ");
    return res.status(400).json({ message });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    return res.status(409).json({ message: `A record with this ${field} already exists.` });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({ message: "Internal server error." });
};
