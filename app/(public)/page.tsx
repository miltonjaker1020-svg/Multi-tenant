import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <span className="text-2xl font-bold text-blue-600">MediTenant AI</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-blue-600 hover:underline">Iniciar sesión</Link>
          <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Registrar clínica</Link>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Gestión clínica inteligente <br /> para tu consultorio
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Agenda, pacientes, médicos y pre-triaje con IA en una plataforma multi-tenant segura y escalable.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/register" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700">
            Comenzar gratis
          </Link>
          <Link href="/login" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg hover:bg-gray-50">
            Demo
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-xl font-semibold mb-2">Multi-tenant aislado</h3>
          <p className="text-gray-600">Cada clínica tiene su propio schema en PostgreSQL con aislamiento total de datos.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-xl font-semibold mb-2">Pre-triaje con IA</h3>
          <p className="text-gray-600">Gemini genera pre-informes clínicos automáticos a partir de los síntomas del paciente.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-xl font-semibold mb-2">Resiliente por diseño</h3>
          <p className="text-gray-600">Rate limiting, idempotencia y cookies httpOnly para máxima seguridad.</p>
        </div>
      </section>
    </main>
  );
}