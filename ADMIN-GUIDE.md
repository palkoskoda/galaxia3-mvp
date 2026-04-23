# Admin Príručka - Zákaznícka Podpora

## Rýchly prístup k zákazníkom

### 1. Vyhľadať zákazníka

**Endpoint:** `GET /api/admin/customer-service/search?query={hľadaný výraz}`

**Príklad:**
```bash
curl -H "Authorization: Bearer {token}" \
  "https://galaxia3-mvp.onrender.com/api/admin/customer-service/search?query=Novák"
```

**Výsledok:** Zoznam zákazníkov podľa mena, emailu, telefónu alebo adresy (max 20 výsledkov).

---

### 2. Detail zákazníka

**Endpoint:** `GET /api/admin/customer-service/user/{userId}`

**Príklad:**
```bash
curl -H "Authorization: Bearer {token}" \
  "https://galaxia3-mvp.onrender.com/api/admin/customer-service/user/user-001"
```

**Výsledok:**
- Základné info (meno, email, telefón, adresa)
- Aktuálne objednávky (budúce dni)
- História objednávok (minulé dni)

---

### 3. Reset hesla

**Endpoint:** `PUT /api/admin/customer-service/user/{userId}/reset-password`

**Príklad:**
```bash
curl -X PUT -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"password":"noveheslo123"}' \
  "https://galaxia3-mvp.onrender.com/api/admin/customer-service/user/user-001/reset-password"
```

**Výsledok:** Dočasné heslo, ktoré adminovi diktuje zákazníkovi.

---

### 4. Zrušiť objednávku

**Endpoint:** `DELETE /api/admin/customer-service/plan/{planId}`

**Príklad:**
```bash
curl -X DELETE -H "Authorization: Bearer {token}" \
  "https://galaxia3-mvp.onrender.com/api/admin/customer-service/plan/plan-u001-dm-..."
```

**Kontrola:**
- ❌ Deň je uzamknutý → nemožno zrušiť
- ❌ Uzávierka uplynula → nemožno zrušiť
- ✅ Inak → objednávka zrušená

---

### 5. Upraviť objednávku (zmeniť množstvo)

**Endpoint:** `PUT /api/admin/customer-service/plan/{planId}`

**Príklad:**
```bash
curl -X PUT -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"quantity":2}' \
  "https://galaxia3-mvp.onrender.com/api/admin/customer-service/plan/plan-u001-dm-..."
```

**Množstvo 0** = zrušiť objednávku

---

### 6. Vytvoriť objednávku za zákazníka

**Endpoint:** `POST /api/admin/customer-service/user/{userId}/create-order`

**Príklad:**
```bash
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"dailyMenuId":"dm-2026-04-24-MenuA-...","quantity":1}' \
  "https://galaxia3-mvp.onrender.com/api/admin/customer-service/user/user-001/create-order"
```

---

### 7. Dnešné objednávky (rýchly prehľad)

**Endpoint:** `GET /api/admin/customer-service/today-orders`

**Príklad:**
```bash
curl -H "Authorization: Bearer {token}" \
  "https://galaxia3-mvp.onrender.com/api/admin/customer-service/today-orders"
```

---

## Typické scenáre

### Scenár 1: Zákazník volá, že mu nejde prihlásenie

1. **Vyhľadaj** zákazníka podľa mena/emailu
2. **Over** účet — pozri detail, či je aktívny
3. **Resetuj heslo** — vytvor dočasné heslo
4. **Diktuješ** zákazníkovi nové heslo
5. **Zákazník sa prihlási** a zmení si heslo

### Scenár 2: Zákazník chce zrušiť obed

1. **Vyhľadaj** zákazníka
2. **Pozri** aktuálne objednávky
3. **Skontroluj** či nie je po uzávierke
4. **Zruš** objednávku (DELETE alebo quantity=0)
5. **Potvrď** zákazníkovi, že je zrušené

### Scenár 3: Zákazník chce zmeniť objednávku

1. **Vyhľadaj** zákazníka
2. **Pozri** aktuálne objednávky
3. **Uprav** množstvo (PUT s novým quantity)
4. **Potvrď** zákazníkovi zmenu

### Scenár 4: Zákazník chce objednať, ale nestíha online

1. **Vyhľadaj** zákazníka
2. **Skontroluj** dostupné jedlá na daný deň
3. **Vytvor** objednávku za zákazníka (POST)
4. **Potvrď** objednávku

---

## Bezpečnostné pravidlá

- ✅ **Kontroluj uzávierky** — nikdy neupravuj objednávky po termíne
- ✅ **Loguj zmeny** — každá zmena cez admina sa zaznamenáva (last_updated)
- ✅ **Overuj identitu** — pred resetom hesla over, že volá skutočný zákazník
- ❌ **Nemaž uzamknuté dni** — rešpektuj systém uzávierok

---

## Technické detaily

**Prístupové práva:**
- `admin` — všetky operácie
- `staff` — vyhľadávanie, úpravy, ale NIE reset hesla

**Autentifikácia:** Všetky endpointy vyžadujú JWT token v hlavičke `Authorization: Bearer {token}`
