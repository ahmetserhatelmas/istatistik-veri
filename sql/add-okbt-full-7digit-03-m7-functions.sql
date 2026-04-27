-- m7_obktb_0..118: macid7 (7 haneli) tüm 2-6'lı kombinasyonlar (119 fonksiyon, itertools sırası).
-- Yeni prefix 'm7_obktb' — mevcut macid7_obktb_0..19 fonksiyonlarına DOKUNMAZ.
-- DDL only — anında çalışır, tablo taraması yapmaz.

-- m7_obktb_0: A+B
CREATE OR REPLACE FUNCTION public.m7_obktb_0(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 0) $$;

-- m7_obktb_1: A+C
CREATE OR REPLACE FUNCTION public.m7_obktb_1(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 1) $$;

-- m7_obktb_2: A+D
CREATE OR REPLACE FUNCTION public.m7_obktb_2(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 2) $$;

-- m7_obktb_3: A+E
CREATE OR REPLACE FUNCTION public.m7_obktb_3(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 3) $$;

-- m7_obktb_4: A+F
CREATE OR REPLACE FUNCTION public.m7_obktb_4(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 4) $$;

-- m7_obktb_5: A+G
CREATE OR REPLACE FUNCTION public.m7_obktb_5(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 5) $$;

-- m7_obktb_6: B+C
CREATE OR REPLACE FUNCTION public.m7_obktb_6(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 6) $$;

-- m7_obktb_7: B+D
CREATE OR REPLACE FUNCTION public.m7_obktb_7(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 7) $$;

-- m7_obktb_8: B+E
CREATE OR REPLACE FUNCTION public.m7_obktb_8(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 8) $$;

-- m7_obktb_9: B+F
CREATE OR REPLACE FUNCTION public.m7_obktb_9(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 9) $$;

-- m7_obktb_10: B+G
CREATE OR REPLACE FUNCTION public.m7_obktb_10(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 10) $$;

-- m7_obktb_11: C+D
CREATE OR REPLACE FUNCTION public.m7_obktb_11(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 11) $$;

-- m7_obktb_12: C+E
CREATE OR REPLACE FUNCTION public.m7_obktb_12(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 12) $$;

-- m7_obktb_13: C+F
CREATE OR REPLACE FUNCTION public.m7_obktb_13(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 13) $$;

-- m7_obktb_14: C+G
CREATE OR REPLACE FUNCTION public.m7_obktb_14(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 14) $$;

-- m7_obktb_15: D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_15(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 15) $$;

-- m7_obktb_16: D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_16(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 16) $$;

-- m7_obktb_17: D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_17(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 17) $$;

-- m7_obktb_18: E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_18(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 18) $$;

-- m7_obktb_19: E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_19(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 19) $$;

-- m7_obktb_20: F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_20(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 20) $$;

-- m7_obktb_21: A+B+C
CREATE OR REPLACE FUNCTION public.m7_obktb_21(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 21) $$;

-- m7_obktb_22: A+B+D
CREATE OR REPLACE FUNCTION public.m7_obktb_22(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 22) $$;

-- m7_obktb_23: A+B+E
CREATE OR REPLACE FUNCTION public.m7_obktb_23(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 23) $$;

-- m7_obktb_24: A+B+F
CREATE OR REPLACE FUNCTION public.m7_obktb_24(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 24) $$;

-- m7_obktb_25: A+B+G
CREATE OR REPLACE FUNCTION public.m7_obktb_25(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 25) $$;

-- m7_obktb_26: A+C+D
CREATE OR REPLACE FUNCTION public.m7_obktb_26(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 26) $$;

-- m7_obktb_27: A+C+E
CREATE OR REPLACE FUNCTION public.m7_obktb_27(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 27) $$;

-- m7_obktb_28: A+C+F
CREATE OR REPLACE FUNCTION public.m7_obktb_28(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 28) $$;

-- m7_obktb_29: A+C+G
CREATE OR REPLACE FUNCTION public.m7_obktb_29(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 29) $$;

-- m7_obktb_30: A+D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_30(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 30) $$;

-- m7_obktb_31: A+D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_31(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 31) $$;

-- m7_obktb_32: A+D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_32(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 32) $$;

-- m7_obktb_33: A+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_33(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 33) $$;

-- m7_obktb_34: A+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_34(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 34) $$;

-- m7_obktb_35: A+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_35(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 35) $$;

-- m7_obktb_36: B+C+D
CREATE OR REPLACE FUNCTION public.m7_obktb_36(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 36) $$;

-- m7_obktb_37: B+C+E
CREATE OR REPLACE FUNCTION public.m7_obktb_37(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 37) $$;

-- m7_obktb_38: B+C+F
CREATE OR REPLACE FUNCTION public.m7_obktb_38(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 38) $$;

-- m7_obktb_39: B+C+G
CREATE OR REPLACE FUNCTION public.m7_obktb_39(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 39) $$;

-- m7_obktb_40: B+D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_40(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 40) $$;

-- m7_obktb_41: B+D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_41(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 41) $$;

-- m7_obktb_42: B+D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_42(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 42) $$;

-- m7_obktb_43: B+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_43(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 43) $$;

-- m7_obktb_44: B+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_44(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 44) $$;

-- m7_obktb_45: B+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_45(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 45) $$;

-- m7_obktb_46: C+D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_46(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 46) $$;

-- m7_obktb_47: C+D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_47(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 47) $$;

-- m7_obktb_48: C+D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_48(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 48) $$;

-- m7_obktb_49: C+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_49(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 49) $$;

-- m7_obktb_50: C+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_50(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 50) $$;

-- m7_obktb_51: C+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_51(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 51) $$;

-- m7_obktb_52: D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_52(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 52) $$;

-- m7_obktb_53: D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_53(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 53) $$;

-- m7_obktb_54: D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_54(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 54) $$;

-- m7_obktb_55: E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_55(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 55) $$;

-- m7_obktb_56: A+B+C+D
CREATE OR REPLACE FUNCTION public.m7_obktb_56(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 56) $$;

-- m7_obktb_57: A+B+C+E
CREATE OR REPLACE FUNCTION public.m7_obktb_57(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 57) $$;

-- m7_obktb_58: A+B+C+F
CREATE OR REPLACE FUNCTION public.m7_obktb_58(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 58) $$;

-- m7_obktb_59: A+B+C+G
CREATE OR REPLACE FUNCTION public.m7_obktb_59(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 59) $$;

-- m7_obktb_60: A+B+D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_60(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 60) $$;

-- m7_obktb_61: A+B+D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_61(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 61) $$;

-- m7_obktb_62: A+B+D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_62(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 62) $$;

-- m7_obktb_63: A+B+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_63(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 63) $$;

-- m7_obktb_64: A+B+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_64(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 64) $$;

-- m7_obktb_65: A+B+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_65(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 65) $$;

-- m7_obktb_66: A+C+D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_66(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 66) $$;

-- m7_obktb_67: A+C+D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_67(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 67) $$;

-- m7_obktb_68: A+C+D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_68(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 68) $$;

-- m7_obktb_69: A+C+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_69(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 69) $$;

-- m7_obktb_70: A+C+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_70(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 70) $$;

-- m7_obktb_71: A+C+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_71(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 71) $$;

-- m7_obktb_72: A+D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_72(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 72) $$;

-- m7_obktb_73: A+D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_73(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 73) $$;

-- m7_obktb_74: A+D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_74(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 74) $$;

-- m7_obktb_75: A+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_75(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 75) $$;

-- m7_obktb_76: B+C+D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_76(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 76) $$;

-- m7_obktb_77: B+C+D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_77(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 77) $$;

-- m7_obktb_78: B+C+D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_78(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 78) $$;

-- m7_obktb_79: B+C+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_79(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 79) $$;

-- m7_obktb_80: B+C+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_80(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 80) $$;

-- m7_obktb_81: B+C+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_81(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 81) $$;

-- m7_obktb_82: B+D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_82(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 82) $$;

-- m7_obktb_83: B+D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_83(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 83) $$;

-- m7_obktb_84: B+D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_84(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 84) $$;

-- m7_obktb_85: B+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_85(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 85) $$;

-- m7_obktb_86: C+D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_86(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 86) $$;

-- m7_obktb_87: C+D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_87(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 87) $$;

-- m7_obktb_88: C+D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_88(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 88) $$;

-- m7_obktb_89: C+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_89(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 89) $$;

-- m7_obktb_90: D+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_90(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 90) $$;

-- m7_obktb_91: A+B+C+D+E
CREATE OR REPLACE FUNCTION public.m7_obktb_91(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 91) $$;

-- m7_obktb_92: A+B+C+D+F
CREATE OR REPLACE FUNCTION public.m7_obktb_92(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 92) $$;

-- m7_obktb_93: A+B+C+D+G
CREATE OR REPLACE FUNCTION public.m7_obktb_93(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 93) $$;

-- m7_obktb_94: A+B+C+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_94(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 94) $$;

-- m7_obktb_95: A+B+C+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_95(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 95) $$;

-- m7_obktb_96: A+B+C+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_96(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 96) $$;

-- m7_obktb_97: A+B+D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_97(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 97) $$;

-- m7_obktb_98: A+B+D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_98(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 98) $$;

-- m7_obktb_99: A+B+D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_99(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 99) $$;

-- m7_obktb_100: A+B+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_100(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 100) $$;

-- m7_obktb_101: A+C+D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_101(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 101) $$;

-- m7_obktb_102: A+C+D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_102(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 102) $$;

-- m7_obktb_103: A+C+D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_103(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 103) $$;

-- m7_obktb_104: A+C+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_104(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 104) $$;

-- m7_obktb_105: A+D+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_105(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 105) $$;

-- m7_obktb_106: B+C+D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_106(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 106) $$;

-- m7_obktb_107: B+C+D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_107(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 107) $$;

-- m7_obktb_108: B+C+D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_108(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 108) $$;

-- m7_obktb_109: B+C+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_109(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 109) $$;

-- m7_obktb_110: B+D+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_110(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 110) $$;

-- m7_obktb_111: C+D+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_111(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 111) $$;

-- m7_obktb_112: A+B+C+D+E+F
CREATE OR REPLACE FUNCTION public.m7_obktb_112(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 112) $$;

-- m7_obktb_113: A+B+C+D+E+G
CREATE OR REPLACE FUNCTION public.m7_obktb_113(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 113) $$;

-- m7_obktb_114: A+B+C+D+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_114(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 114) $$;

-- m7_obktb_115: A+B+C+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_115(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 115) $$;

-- m7_obktb_116: A+B+D+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_116(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 116) $$;

-- m7_obktb_117: A+C+D+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_117(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 117) $$;

-- m7_obktb_118: B+C+D+E+F+G
CREATE OR REPLACE FUNCTION public.m7_obktb_118(r public.matches)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.okbt7_basamak_toplam(r.id::text, 118) $$;
