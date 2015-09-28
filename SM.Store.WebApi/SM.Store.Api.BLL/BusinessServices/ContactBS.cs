using System.Collections.Generic;
using System;
using SM.Store.Api.Entities;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using SM.Store.Api.DAL;

namespace SM.Store.Api.BLL
{
    public class ContactBS : IContactBS
    {
        private IContactRepository _contactRepository;
        
        public ContactBS(IContactRepository contactRepository)
        {
            if (contactRepository != null)
                this._contactRepository = contactRepository;            
        }
        
        public IList<Entities.Contact> GetContacts()
        {
            return this._contactRepository.GetContacts();
        }

        public Entities.Contact GetContactById(int id)
        {
            return this._contactRepository.GetContactById(id);
        }

        public int AddContact(Entities.Contact inputEt)
        {
            return this._contactRepository.AddContact(inputEt);
        }

        public void UpdateContact(Entities.Contact inputEt)
        {
            this._contactRepository.UpdateContact(inputEt);
        }

        public void DeleteContact(int id)
        {
            this._contactRepository.DeleteContact(id);
        }
    }
}
