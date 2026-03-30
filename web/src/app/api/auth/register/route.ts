import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Kurduğumuz global veritabanı bağlantısı
import bcrypt from "bcryptjs";
import { z } from "zod";

// 1. Zod ile Gelen Veri Şemasını (Validation Rules) Tanımlıyoruz
// Bu sayede if/else yığınlarından kurtulup tertemiz bir kontrol yapıyoruz.
const registerSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
  fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır."),
  // Sadece STUDENT veya INSTRUCTOR kabul et, boş gelirse STUDENT yap:
  role: z.enum(["STUDENT", "INSTRUCTOR"]).default("STUDENT"),
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı oluşturur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *                 minLength: 6
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *                 minLength: 2
 *               role:
 *                 type: string
 *                 enum: [STUDENT, INSTRUCTOR]
 *                 default: STUDENT
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 *       400:
 *         description: Doğrulama hatası
 *       409:
 *         description: Bu e-posta adresi zaten kullanımda
 *       500:
 *         description: Sunucu tarafında hata
 */
export async function POST(request: Request) {
  try {
    // 2. İstemciden (Frontend) gelen veriyi al
    const body = await request.json();

    // 3. Veriyi Zod şemamız ile doğrula
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      // Eğer veri hatalıysa (örn: şifre 3 harfliyse), Frontend'e 400 Bad Request dön
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    // Artık verimizin %100 doğru formatta olduğundan eminiz.
    const { email, password, fullName, role } = validation.data;

    // 4. Bu e-posta ile kayıtlı başka bir kullanıcı var mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kullanımda." },
        { status: 409 }, // 409 Conflict (Çakışma) statü kodu
      );
    }

    // 5. Şifreyi Şifrele (Hashing)
    const salt = await bcrypt.genSalt(10); // Şifreyi karmaşıklaştırmak için 'tuz' ekliyoruz
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Yeni kullanıcıyı Prisma ile veritabanına kaydet
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        role,
      },
    });

    // 7. GÜVENLİK ÖNLEMİ: Frontend'e döneceğimiz veriden 'passwordHash'i çıkarıyoruz
    const { passwordHash, ...userWithoutPassword } = newUser;

    // 8. İşlem başarılı, 201 Created kodu ile kullanıcı bilgilerini dön
    return NextResponse.json(
      {
        message: "Kullanıcı başarıyla oluşturuldu.",
        user: userWithoutPassword,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Kayıt API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
