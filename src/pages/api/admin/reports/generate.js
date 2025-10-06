import clientPromise from "../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../lib/adminAuth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const admin = verifyAdminToken(req);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { reportType } = req.body;

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Fetch data
    const salons = await db.collection("salons").find({}).toArray();
    const users = await db.collection("users").find({}).toArray();
    const bookings = await db.collection("bookings").find({}).toArray();

    // Create PDF
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("TechTrims Admin Report", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Report Type: ${reportType}`, 105, 30, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 38, {
      align: "center",
    });

    // Summary
    doc.setFontSize(16);
    doc.text("Summary", 14, 50);

    doc.setFontSize(12);
    doc.text(`Total Salons: ${salons.length}`, 14, 60);
    doc.text(`Total Users: ${users.length}`, 14, 68);
    doc.text(`Total Bookings: ${bookings.length}`, 14, 76);

    // Salons Table
    if (reportType === "comprehensive" || reportType === "salons") {
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Salons Details", 14, 20);

      const salonData = salons.map((salon) => [
        salon.salonName || "N/A",
        salon.ownerName || "N/A",
        salon.phone || "N/A",
        salon.stats?.totalBookings || 0,
        (salon.ratings?.overall || 5.0).toFixed(1),
        salon.isActive ? "Active" : "Inactive",
      ]);

      autoTable(doc, {
        startY: 25,
        head: [
          ["Salon Name", "Owner", "Phone", "Bookings", "Rating", "Status"],
        ],
        body: salonData,
      });
    }

    // Users Table
    if (reportType === "comprehensive" || reportType === "users") {
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Users Details", 14, 20);

      const userData = users.map((user) => [
        user.name || "N/A",
        user.phone || "N/A",
        user.email || "N/A",
        user.bookingHistory?.length || 0,
        new Date(user.createdAt).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: 25,
        head: [["Name", "Phone", "Email", "Bookings", "Joined"]],
        body: userData,
      });
    }

    // Output PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=TechTrims_Report_${reportType}_${Date.now()}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Report generation error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
