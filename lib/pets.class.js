const ierrors = require("./errors");
const Sender = require("./sender.class");
const common = require("./common");
const email = require("email-validator");
/**
 * @typedef {{ 
 * id: string, 
 * pet_name: string, 
 * pet_animal: string, 
 * pet_race?: string,
 * disappearance_date: Date,
 * disappearance_place: { coordinates: [number, number], address: string }
 * details: string,
 * picture: string 
 * }} PetSummaryInformation
 * 
 * @typedef {{
 * pet_name: string, 
 * pet_animal: string, 
 * pet_race?: string, 
 * owner_name: string,
 * owner_email: string,
 * owner_phone: string,
 * disappearance_date: Date,
 * disappearance_place: { coordinates: [number, number], address: string }
 * details: string,
 * pictures: string[],
 * reward?: string,
 * found: boolean,
 * owner_home?: { coordinates: [number, number], address: string }
 * }} PetPostInformation
 * 
 * @typedef {{
 * pet_name: string,
 * owner_name: string,
 * owner_email: string,
 * }} PetPostTemplate
 * 
 * @typedef {{
 * owner_home?: { coordinates: [number, number], address: string },
 * pet_race?: string
 * reward?: string
 * }} RemovableInformation
 * 
 */

/** @class */
class Pets extends Sender {
  constructor(token) {
    super();
    /** @private @ignore */
    this.auth_token = token;
  }

  /** Obtiene una lista de mascotas cercanas
   * @param {object} opt - Configuración de lista
   * @param {number} [opt.limit] - Limite de entradas por paginación
   * @param {string} [opt.origin] - Ubicacion y origen geográfico de la consulta, en coordenadas
   * @param {number} [opt.radius] - Radio de búsuqeda, expresado en metros
   * @param {number} [opt.page] - Paginación de la busqueda
   * @param {string} [opt.ip] - IP de origen de la consulta
   *
   * @returns {{results: PetSummaryInformation[], next: number|false}} Lista de resultados y pagina siguiente
   */
  async nearby(opt = {}) {
    // Establecimiento, comprobación de la información y sus parámetros por defecto
    opt.limit = common.verify(opt.limit, "number", null);
    opt.origin = common.verify(opt.origin, "string", null);
    opt.radius = common.verify(opt.radius, "number", null);
    opt.page = common.verify(opt.page, "number", null);
    opt.ip = common.verify(opt.ip, "string", null);

    // Generacion de URL
    const url = common.url("/pets", opt);

    // Conexión
    const res = await super.get(url);
    const next = (res.body.details.page_details != false) ? res.body.details.page_details : false;
    return {results: res.body.details.items, next};
  }

  /** Obtiene la información de una mascota según su id
   * @param {object} opt - Configuración de petición
   * @param {string} id - ViewID o EditID de la mascota a obtener
   * @param {string} [opt.format] - Formato del muestreo de datos
   * 
   * @returns {(PetPostInformation|PetPostTemplate)} Información referente a la mascota
   */
  async view(id, opt = {}) {
    // Comprobación de que existe la información necesaria
    if (!common.only_setted(id))
      throw new ierrors.UndefinedRequiredData(
        "There are required data not declared (id)"
      );

    // Establecimiento, comprobación de la información y sus parámetros por defecto
    id = common.verify(id, "string");
    const format = common.verify(opt.format, "string", null);

    // Generación de URL
    const url = common.url(`/pets/single/${id}`, { format });

    // Conexión
    const res = await super.get(url);
    return res.body.details.items;
  }

  /** Busca una publicación según un termino de entrada
   * 
   * @param {object} opt - Configuración de búsqueda
   * @param {string} search - Término de búsqueda
   * @param {number} [opt.limit] - Limite de entradas por paginación
   * @param {number} [opt.page] - Paginación de la busqueda
   * 
   * @returns {{results: PetSummaryInformation[], next: number|false}} Lista de resultados y pagina siguiente
   */
  async search(query, opt = {}) {
    // Comprobación de que existe la información necesaria
    if (!common.only_setted(query))
      throw new ierrors.UndefinedRequiredData(
        "There are required data not declared (query)"
      );

    // Establecimiento de la información y los parámetros por defecto
    const search = common.verify(query, "string");
    const limit = common.verify(opt.limit, "number", 10);
    const page = common.verify(opt.page, "number", 1);

    // Generación de URL
    const url = common.url("/pets/search", { q: search, limit, page });

    // Conexión
    const res = await super.get(url);
    const next = (res.body.details.page_details != false) ? res.body.details.page_details : false;
    return {results: res.body.details.items, next};
  }

  /** Crea una nueva publicación
   * @param {object} opt - Datos de la mascota
   * @param {string} opt.pet_animal - Tipo de animal
   * @param {string} [opt.pet_race] - Raza
   * @param {string} opt.pet_name - Nombre de la mascota
   * @param {string} opt.disappearance_date - Fecha y hora de desaparición
   * @param {string} opt.disappearance_place - Lugar de desaparición en coordenadas separadas por coma
   * @param {string} opt.details - Detalles sobre la desaparición
   * @param {object} opt.pet_photo_0 - Primera imágen
   * @param {object} [opt.pet_photo_1] - Segunda imágen
   * @param {object} [opt.pet_photo_2] - Tercera imágen
   * @param {object} [opt.pet_photo_3] - Cuarta imágen
   * @param {object} [opt.pet_photo_4] - Quinta imágen
   * @param {string} opt.owner_name - Nombre del dueño
   * @param {[string]} opt.owner_phone - Teléfono
   * @param {string} opt.owner_email - Correo electrónico
   * @param {string} [opt.owner_address] - Domicilio en coordenadas separadas por coma
   * @param {string} [opt.reward] - Recompensa ofrecida
   * 
   * @returns {{edit_id: string, view_id: string}} Información referente a la nueva mascota publicada
   */
  async add(opt = {}) {

    // Comprobación de que existe la información necesaria
    try {
      common.is_set(
        opt.pet_animal,
        opt.pet_name,
        opt.disappearance_date,
        opt.disappearance_place,
        opt.details, 
        opt.pet_photo_0,
        opt.owner_name,
        opt.owner_phone,
        opt.owner_email
      );
    } catch (err) {
      throw new ierrors.UndefinedRequiredData("There are required data not declared");
    }

    // Establecimiento de la información y los parámetros por defecto
    opt.pet_animal = common.verify(opt.pet_animal, "string");
    if (opt.pet_race != undefined) opt.pet_race = common.verify(opt.pet_race, "string", null);
    opt.pet_name = common.verify(opt.pet_name, "string");
    opt.details = common.verify(opt.details, "string");
    opt.owner_name = common.verify(opt.owner_name, "string");
    if (opt.reward != undefined) opt.reward = common.verify(opt.reward, "string", null);

    // Comprobaciones de que ciertos datos sean válidos
    // Imágenes
    const files_admitted = ["image/jpeg", "image/png"];

    opt.pet_photo_0 = common.verify(opt.pet_photo_0, "object");
    if ( !files_admitted.includes(opt.pet_photo_0.type) ) throw new ierrors.InvalidFile("Only jpeg and png files are allowed");
    
    if (opt.pet_photo_1 != undefined) {
      opt.pet_photo_1 = common.verify(opt.pet_photo_1, "object", null);
      if ( !files_admitted.includes(opt.pet_photo_1.type) )
        throw new ierrors.InvalidFile("Only jpeg and png files are allowed");
    }

    if (opt.pet_photo_2 != undefined) {
      opt.pet_photo_2 = common.verify(opt.pet_photo_2, "object", null);
      if ( !files_admitted.includes(opt.pet_photo_2.type) )
        throw new ierrors.InvalidFile("Only jpeg and png files are allowed");
    }

    if (opt.pet_photo_3 != undefined) {
      opt.pet_photo_3 = common.verify(opt.pet_photo_3, "object", null);
      if ( !files_admitted.includes(opt.pet_photo_3.type) )
        throw new ierrors.InvalidFile("Only jpeg and png files are allowed");
    }

    if (opt.pet_photo_4 != undefined) {
      opt.pet_photo_4 = common.verify(opt.pet_photo_4, "object", null);
      if ( !files_admitted.includes(opt.pet_photo_4.type) )
        throw new ierrors.InvalidFile("Only jpeg and png files are allowed");
    }

    // Coordenadas
    opt.disappearance_place = common.verify( opt.disappearance_place, "string" );
    if (!/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/g.test(opt.disappearance_place)) throw new ierrors.InvalidCoordinates("Invalid coordinates");
    
    if (opt.owner_address != undefined) {
      opt.owner_address = common.verify(opt.owner_address, "string", null);
      if (!/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/g.test(opt.owner_address))
        throw new ierrors.InvalidCoordinates("Invalid coordinates");
    }

    // Cronológico
    opt.disappearance_date = common.verify(opt.disappearance_date, "string");
    if ( !/(\d{4}|\d{2})[^\w\d\r\n:](0?[1-9]|1[0-2])[^\w\d\r\n:](0?[1-9]|[12]\d|30|31)\T(0?([01]?\d|2[0-3]):([0-5]?\d))/gm.test(opt.disappearance_date))
      throw new ierrors.InvalidDate("Invalid date");

    opt.owner_phone = opt.owner_phone.split(',');

    // Contacto
    if (!Array.isArray(opt.owner_phone))
      throw new ierrors.InvalidPhone("Phone must be an array");

    opt.owner_phone = opt.owner_phone.filter(phone => {
      phone = common.verify(phone, "string");
      return common.phone_validation(phone)
    });

    if (opt.owner_phone.length < 1)
      throw new ierrors.InvalidPhone("There are no valid phone in array");

    opt.owner_phone = opt.owner_phone.join(',')
    
    opt.owner_email = common.verify(opt.owner_email, "string");
    if (!email.validate(opt.owner_email))
      throw new ierrors.InvalidEmail("Invalid email address");

    // Creacion de form data
    const pet = common.form_parse(opt);

    // Generación de URL
    const url = common.url("/pets");

    // Conexión
    const res = await super.post(url, pet);
    return res.body.details;
  }

  /** Edita una publicación de una mascota
   * @param {object} opt - Datos a editar
   * @param {string|'unset'} [opt.pet_race] - Raza
   * @param {string} [opt.disappearance_place] - Lugar de desaparición en coordenadas separadas por coma
   * @param {string} [opt.details] - Detalles sobre la desaparición
   * @param {{ unset: [string], add: [string], replace: [[string, string]]}} [opt.owner_phone] - Teléfono
   * @param {string|'unset'} [opt.owner_address] - Domicilio en coordenadas separadas por coma
   * @param {string|'unset'} [opt.reward] - Recompensa ofrecida
   * 
   * @returns {{ $unset: RemovableInformation, owner_phone?: string, owner_home?: { coordinates: [number, number], address: string }, pet_race?: string, disappearance_place?: { coordinates: [number, number], address: string }  details?: string, reward?: string, found?: boolean }} Parametros modificados exsitosamente
   */
  async edit(id, opt = {}) {
    // Comprobación de que existe la información necesaria
    if (!common.only_setted(id))
      throw new ierrors.UndefinedRequiredData(
        "There are required data not declared (id)"
      );

    // Establecimiento, comprobación de la información y sus parámetros por defecto
    if (opt.pet_race != undefined) opt.pet_race = common.verify(opt.pet_race, "string", null);
    if (opt.details != undefined) opt.details = common.verify(opt.details, "string", null);
    if (opt.reward != undefined) opt.reward = common.verify(opt.reward, "string", null);

    // Comprobaciones de que ciertos datos sean válidos
    // Coordenadas
    if (opt.owner_address != undefined) {
      opt.disappearance_place = common.verify(opt.disappearance_place, "string", null);
      if (!/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/g.test(opt.disappearance_place))
        throw new ierrors.InvalidCoordinates("Invalid coordinates");
    }

    if (opt.owner_address != undefined) {
      opt.owner_address = common.verify(opt.owner_address, "string", null);
      if (!/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/g.test(opt.owner_address))
        throw new ierrors.InvalidCoordinates("Invalid coordinates");
    }

    
    // Contacto
    if (opt.owner_phone != undefined) {
      if (typeof(opt.owner_phone) != 'object') opt.owner_phone = JSON.parse(opt.owner_phone);

      if (opt.owner_phone.unset != undefined) {
        opt.owner_phone.unset.map(phone_id => {
          const validation = common.id_validation(phone_id);
          if (!validation) throw new ierrors.InvalidPhone('Invalid phone');
        });
      }

      if (opt.owner_phone.replace != undefined) {
        Object.keys(opt.owner_phone.replace).map(id => {
          const number = opt.owner_phone.replace[id];
          const validation = common.phone_validation(number) && common.id_validation(id);
          if (!validation) throw new ierrors.InvalidPhone('Invalid phone');
        });
      }
      
      if (opt.owner_phone.add != undefined) {
        opt.owner_phone.add.map(phone => {
          const validation = common.phone_validation(phone);
          if (!validation) throw new ierrors.InvalidPhone('Invalid phone');
        });
      }

      opt.owner_phone = JSON.stringify(opt.owner_phone);
    }

    // Creacion de form data
    const pet = common.form_parse(opt);

    // Generación de URL
    const url = common.url(`/pets/${id}`);

    // Conexión
    const res = await super.put(url, pet);
    return res.body.details;
  }

  /** Borra una publicación de una mascota
   * @param {string} id - ID de edición de la mascota
   */
  async delete(id) {
    // Comprobación de existencia del ID
    if (!common.only_setted(id)) 
      throw new ierrors.UndefinedRequiredData("There are required data not declared (id)");

    // Generación de la URL
    const url = common.url(`/pets/${id}`);

    // Conexión
    const res = await super.delete(url);
    return true;
  }
}

module.exports = Pets;
