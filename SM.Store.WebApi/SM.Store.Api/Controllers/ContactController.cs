using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Description;
using System.Web.Http.ModelBinding;
using SM.Store.Api.BLL;
using SM.Store.Api.Common;
using SM.Store.Api.DAL;
using SM.Store.Api.Models;

namespace SM.Store.Api.Controllers
{    
    [RoutePrefix("api/contacts")]
    public class ContactsController : ApiController
    {
        [Route("~/api/getcontactlist")]
        public ContactListResponse GetContactList()
        {
            var resp = new ContactListResponse();
            resp.Contacts = new Models.Contacts();           

            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            IList<Entities.Contact> rtnList = bs.GetContacts();
            IBaseConverter<Entities.Contact, Models.Contact> convtResult = new AutoMapConverter<Entities.Contact, Models.Contact>();
            var convtList = convtResult.ConvertObjectCollection(rtnList);
            resp.Contacts.AddRange(convtList);           
            return resp;           
        }

               
        [Route("{id:int}", Name = "GetContactById")]
        [ResponseType(typeof(Contact))]
        public IHttpActionResult GetContactById(int id)
        {
            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            var eContact = bs.GetContactById(id);
            if (eContact == null)
            {
                return NotFound();
            }
            else
            {
                IBaseConverter<Entities.Contact, Models.Contact> convtResult = new AutoMapConverter<Entities.Contact, Models.Contact>();
                Models.Contact mContact = convtResult.ConvertObject(eContact);
                return Ok(mContact);
            }
        }
        
        [Route("~/api/addcontact")]
        public AddContactResponse Post_AddContact([FromBody] Models.Contact mContact)
        {
            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            IBaseConverter<Models.Contact, Entities.Contact> convtResult = new AutoMapConverter<Models.Contact, Entities.Contact>();
            Entities.Contact eContact = convtResult.ConvertObject(mContact);
            bs.AddContact(eContact);
            
            var addContactResponse = new AddContactResponse() 
            {
                ContactID =  eContact.ContactID
            };
            return addContactResponse; 
        }

        [Route("~/api/addcontacts")]
        public AddContactsResponse Post_AddContacts([FromBody] List<Models.Contact> mContactList)
        {
            var contactIdList = new List<int>();
            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            foreach (var mContact in mContactList)
            {
                IBaseConverter<Models.Contact, Entities.Contact> convtResult = new AutoMapConverter<Models.Contact, Entities.Contact>();
                Entities.Contact eContact = convtResult.ConvertObject(mContact);
                bs.AddContact(eContact);
                contactIdList.Add(eContact.ContactID);                
            }
            var resp = new AddContactsResponse();
            resp.ContactIdList = contactIdList;
            return resp;
        }

        [Route("~/api/updatecontact")]
        public void Post_UpdateContact([FromBody] Models.Contact mContact)
        {
            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            IBaseConverter<Models.Contact, Entities.Contact> convtResult = new AutoMapConverter<Models.Contact, Entities.Contact>();
            Entities.Contact eContact = convtResult.ConvertObject(mContact);
            bs.UpdateContact(eContact);
        }

        [Route("~/api/updatecontacts")]
        public void Post_UpdateContacts([FromBody] List<Models.Contact> mContactList)
        {
            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            foreach (var mContact in mContactList)
            {
                IBaseConverter<Models.Contact, Entities.Contact> convtResult = new AutoMapConverter<Models.Contact, Entities.Contact>();
                Entities.Contact eContact = convtResult.ConvertObject(mContact);
                bs.UpdateContact(eContact);
            }            
        }

        [Route("~/api/deletecontact")]
        public void DeleteContact(int id)
        {
            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            bs.DeleteContact(id);
        }

        [Route("~/api/deletecontacts")]
        public void Post_DeleteContact(List<int> ids)
        {
            IContactBS bs = DIFactoryDesigntime.GetInstance<IContactBS>();
            if (ids.Count > 0)
            {
                ids.ForEach(delegate(int id)
                {
                    bs.DeleteContact(id);
                });
            }
        }        
    }
}
