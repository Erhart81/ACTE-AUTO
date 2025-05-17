
// înlocuire cu elemente HTML simple
const Input = (props) => <input {...props} className="border rounded p-2 w-full" />;
const Button = (props) => <button {...props} className="bg-blue-600 text-white p-2 rounded w-full" />;

export default function ContractAutoDemo() {
  const [sellerCI, setSellerCI] = useState(null);
  const [buyerCI, setBuyerCI] = useState(null);
  const [talon, setTalon] = useState(null);
  const [civ, setCiv] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [email, setEmail] = useState("");
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
      setUser(userEmail);
      const savedHistory = localStorage.getItem("history_" + userEmail);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleLogin = () => {
    if (email) {
      localStorage.setItem("userEmail", email);
      setUser(email);
      const savedHistory = localStorage.getItem("history_" + email);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    setUser(null);
    setEmail("");
    setHistory([]);
  };

  const handleFileChange = (event, setter) => {
    const file = event.target.files[0];
    if (file) setter(file);
  };

  const handleGenerate = async () => {
    if (sellerCI && buyerCI && talon && civ) {
      const formData = new FormData();
      formData.append("sellerCI", sellerCI);
      formData.append("buyerCI", buyerCI);
      formData.append("talon", talon);
      formData.append("civ", civ);
      if (user) formData.append("email", user);

      try {
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Eroare la generare PDF");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        const now = new Date();
        const item = {
          date: now.toLocaleString(),
          fileUrl: url
        };
        const newHistory = [item, ...history];
        setHistory(newHistory);
        localStorage.setItem("history_" + user, JSON.stringify(newHistory));
      } catch (error) {
        alert("A apărut o eroare la generarea PDF-ului.");
      }
    } else {
      alert("Te rugăm să încarci toate documentele.");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold text-center">Contract auto nonstop</h1>
      <p className="text-center text-sm text-gray-600">Generează contractul auto simplu, de pe telefon.</p>

      {!user ? (
        <div className="space-y-2">
          <Input type="email" placeholder="Introdu emailul tău" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={handleLogin} className="w-full">Autentificare</Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-center">Autentificat ca: <strong>{user}</strong></p>
          <Button variant="outline" className="w-full" onClick={handleLogout}>Delogare</Button>

          <div className="space-y-2 mt-4">
            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSellerCI)} />
            <label className="block text-sm">Carte de identitate – vânzător</label>

            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setBuyerCI)} />
            <label className="block text-sm">Carte de identitate – cumpărător</label>

            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setTalon)} />
            <label className="block text-sm">Talon auto</label>

            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setCiv)} />
            <label className="block text-sm">Carte de identitate vehicul</label>
          </div>

          <Button className="w-full mt-4" onClick={handleGenerate}>
            Generează PDF
          </Button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              download="contract-auto.pdf"
              className="block mt-4 text-center text-blue-600 underline"
            >
              Descarcă contractul PDF
            </a>
          )}

          {history.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold text-md mb-2">Contracte recente:</h2>
              <ul className="space-y-1 text-sm">
                {history.map((item, idx) => (
                  <li key={idx}>
                    <a href={item.fileUrl} download={`contract-${idx + 1}.pdf`} className="text-blue-600 underline">
                      {item.date}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
