using System;
using System.Collections.Generic;
using SM.Store.Api.Common;
using SM.Store.Api.DAL;
using SM.Store.Api.Entities;
using SM.Store.Api.Models;

namespace SM.Store.Api.DAL
{
    public interface IContactRepository : IGenericRepository<Entities.Contact>
    {
        IList<Entities.Contact> GetContacts();
        Entities.Contact GetContactById(int id);
        int AddContact(Entities.Contact inputEt);
        void UpdateContact(Entities.Contact inputEt);
        void DeleteContact(int id);                 
    }
}
